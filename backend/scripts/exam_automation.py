import time
import random
import logging
from selenium.webdriver.common.by import By

class ExamAutomation:
    def __init__(self, browser_automation):
        self.browser = browser_automation
        self.logger = logging.getLogger(f'exam_{browser_automation.browser_id}')
        self.SELECTORS = {
            "question_content": ".test-questions",
            "options": ".test-select li",
            "radio_btn": ".radio",
            "checkbox_btn": ".checkbox", 
            "next_btn": ".test-btn-down",
            "prev_btn": ".test-btn-up",
            "question_nav": "#back-problem-box .list",
            "submit_btn": ".submitBtn",
            "confirm_submit": "//button[contains(text(),'确认')]",
        }
    
    def start_exam(self):
        """开始考试流程"""
        try:
            # 驱动断开直接退出
            if not getattr(self.browser, 'is_driver_alive', None) or not self.browser.is_driver_alive():
                self.browser.status = "答题失败"
                self.browser.current_action = "浏览器未连接或已关闭"
                return False
            self.browser.status = "答题中"
            self.browser.current_action = "开始检测考试题目"
            
            # 等待页面加载
            time.sleep(5)
            
            # 获取所有题目状态
            all_questions = self.get_all_questions_status()
            total_questions = len(all_questions)
            
            if total_questions == 0:
                self.browser.current_action = "未找到题目，等待页面加载..."
                time.sleep(10)
                all_questions = self.get_all_questions_status()
                total_questions = len(all_questions)
                if total_questions == 0:
                    self.browser.current_action = "未检测到考试题目"
                    return False
            
            # 找出未答题目
            unanswered_questions = [q for q in all_questions if q["status"] in ["unanswered", "current"]]
            
            self.update_progress(total_questions - len(unanswered_questions), total_questions)
            
            self.browser.current_action = f"答题进度: {self.browser.progress['current']}/{self.browser.progress['total']} ({self.browser.progress['percentage']}%)"
            
            # 回答所有题目
            for i, question in enumerate(unanswered_questions):
                if not self.browser.is_running:
                    break
                if not self.browser.is_driver_alive():
                    self.browser.status = "答题失败"
                    self.browser.current_action = "浏览器已关闭或驱动断开"
                    break
                
                self.logger.info(f"🎯 处理第 {i+1}/{len(unanswered_questions)} 个题目 (ID: {question['id']})")
                
                if not self.goto_question(question["id"]):
                    self.logger.warning(f"跳转题目失败，跳过: {question['id']}")
                    continue
                
                # 获取题目信息
                question_info = self.get_current_question_info()
                options = self.get_current_options()
                
                if not question_info or not options:
                    self.logger.warning(f"获取题目信息失败，跳过: {question['id']}")
                    continue
                
                # 打印题目信息
                self.print_question_info({"question": question_info, "options": options})
                
                # 智能选择答案
                answer_content = self.auto_answer_strategy(question_info, options)
                if answer_content:
                    success = self.select_answer_by_content(answer_content, options, question_info["type"])
                    if success:
                        self.logger.info(f"✅ 第 {question_info.get('index', '未知')} 题回答成功")
                    else:
                        self.logger.warning(f"⚠️ 第 {question_info.get('index', '未知')} 题选择失败")
                else:
                    self.logger.warning(f"❌ 无法确定答案，跳过: {question['id']}")
                
                # 更新进度
                self.update_progress(self.browser.progress['current'] + 1, total_questions)
                self.browser.current_action = f"答题进度: {self.browser.progress['current']}/{self.browser.progress['total']} ({self.browser.progress['percentage']}%)"
                
                time.sleep(random.uniform(2, 4))
            
            # 自动提交
            if (self.browser.config.get('auto_submit_exam', True) and 
                self.browser.progress['current'] >= self.browser.progress['total']):
                self.submit_exam()
            
            self.browser.status = "答题完成"
            self.browser.current_action = f"考试完成: {self.browser.progress['current']}/{self.browser.progress['total']} 题"
            return True
            
        except Exception as e:
            self.browser.status = "答题失败"
            self.browser.current_action = f"答题过程出错: {str(e)}"
            self.logger.error(f"考试自动化失败: {e}")
            return False
    
    def auto_answer_strategy(self, question_info, options):
        """智能答题策略（优先题库，其次AI）"""
        if not options:
            return None
        
        # 1. 首先尝试从题库中查找答案（返回选项内容）
        answer_content_from_bank = self.browser.question_bank.find_answer(
            question_info['text'], 
            options, 
            question_info['type']
        )
        
        if answer_content_from_bank:
            self.logger.info(f"🎯 使用题库答案: {answer_content_from_bank}")
            return answer_content_from_bank
        
        # 2. 如果没有题库答案，询问AI
        if (self.browser.ai_assistant and 
            self.browser.config.get('enable_ai_assistant', True)):
            self.logger.info("🤖 题库未找到答案，询问AI...")
            ai_answer_content = self.browser.ai_assistant.get_ai_answer(question_info, options)
            
            if ai_answer_content:
                self.logger.info(f"✅ 获得AI答案: {ai_answer_content}")
                # 立即将题目和AI答案保存到题库
                self.browser.question_bank.add_question(question_info, options, ai_answer_content)
                return ai_answer_content
        
        # 3. 如果AI也失败，使用默认策略
        self.logger.warning("⚠️ AI回答失败，使用默认策略")
        question_type = question_info["type"]
        
        if question_type == "radio":
            # 单选题：选择第一个选项的内容
            answer = options[0]["content"]
            self.logger.info(f"🔧 使用默认策略(单选): {answer}")
            return answer
        elif question_type == "checkbox":
            # 多选题：选择第一个选项的内容
            answer = options[0]["content"]
            self.logger.info(f"🔧 使用默认策略(多选): {answer}")
            return answer
        
        return None

    # 其他方法保持你原来的实现...
    def get_all_questions_status(self):
        """获取所有题目状态"""
        try:
            questions = []
            nav_elems = self.browser.driver.find_elements(By.CSS_SELECTOR, self.SELECTORS["question_nav"])
            
            for elem in nav_elems:
                questions.append({
                    "index": elem.text,
                    "id": elem.get_attribute("data-value"),
                    "type": elem.get_attribute("data-list"),
                    "status": "answered" if "already" in elem.get_attribute("class") else 
                             "current" if "now" in elem.get_attribute("class") else "unanswered",
                    "element": elem
                })
            
            return questions
        except Exception as e:
            self.logger.error(f"获取题目状态失败: {e}")
            return []

    def goto_question(self, question_id):
        """跳转到指定题目"""
        max_attempts = 3
        
        for attempt in range(max_attempts):
            try:
                nav_elem = self.browser.driver.find_element(By.CSS_SELECTOR, f'[data-value="{question_id}"]')
                
                if self.safe_click_element(nav_elem, f"题目{question_id}"):
                    time.sleep(2)
                    return True
                    
            except Exception as e:
                self.logger.warning(f"跳转题目失败 ({attempt + 1}/{max_attempts}): {e}")
                time.sleep(2)
        
        self.logger.error(f"❌ 跳转题目失败: {question_id}")
        return False

    def get_current_question_info(self):
        """获取当前题目详细信息"""
        try:
            question_elem = self.browser.driver.find_element(By.CSS_SELECTOR, self.SELECTORS["question_content"])
            question_id = question_elem.get_attribute("data-component")
            question_full_text = question_elem.text
            question_text = question_full_text.split("、", 1)[1] if "、" in question_full_text else question_full_text
            
            # 获取题目序号
            question_index = question_full_text.split("、", 1)[0] if "、" in question_full_text else "未知"
            
            # 获取题目类型
            option_elems = self.browser.driver.find_elements(By.CSS_SELECTOR, self.SELECTORS["options"])
            question_type = None
            question_type_code = None
            if option_elems:
                first_option = option_elems[0]
                question_type = first_option.get_attribute("data-type")  # radio或checkbox
                question_type_code = first_option.get_attribute("data-list")  # 1:单选, 2:多选, 3:判断
            
            return {
                "id": question_id,
                "index": question_index,
                "text": question_text,
                "full_text": question_full_text,
                "type": question_type,
                "type_code": question_type_code,
                "element": question_elem
            }
        except Exception as e:
            self.logger.error(f"获取题目信息失败: {e}")
            return None

    def get_current_options(self):
        """获取当前题目选项详细信息"""
        try:
            options = []
            option_elems = self.browser.driver.find_elements(By.CSS_SELECTOR, self.SELECTORS["options"])
            
            for elem in option_elems:
                try:
                    btn_elem = elem.find_element(By.CSS_SELECTOR, "[class*='radio'], [class*='checkbox']")
                    option_value = btn_elem.get_attribute("data-value")
                    option_text_elem = elem.find_element(By.CSS_SELECTOR, ".test-select-info p")
                    option_text = option_text_elem.text
                    
                    # 提取选项内容（去掉A. B. 等前缀）
                    option_content = option_text.split(".", 1)[1] if "." in option_text else option_text
                    
                    options.append({
                        "value": option_value,
                        "text": option_text,
                        "content": option_content,
                        "element": btn_elem,
                        "is_selected": "active" in btn_elem.get_attribute("class"),
                        "state": elem.get_attribute("data-state")  # onselect或disselect
                    })
                except Exception as e:
                    self.logger.warning(f"解析选项失败: {e}")
                    continue
            
            return options
        except Exception as e:
            self.logger.error(f"获取选项失败: {e}")
            return []

    def select_answer_by_content(self, answer_content, options, question_type):
        """根据选项内容选择答案"""
        try:
            # 处理多选题（逗号分隔的多个选项内容）
            if question_type == "checkbox" and "," in answer_content:
                target_contents = [content.strip() for content in answer_content.split(",")]
            else:
                target_contents = [answer_content.strip()]
            
            selected_count = 0
            
            for option in options:
                # 比较选项内容（使用宽松匹配）
                option_content_clean = option['content'].strip()
                for target_content in target_contents:
                    if (option_content_clean == target_content or 
                        target_content in option_content_clean or 
                        option_content_clean in target_content):
                        
                        # 尝试点击选项
                        success = self.safe_click_element(option['element'], f"选项: {option['content']}")
                        if success:
                            selected_count += 1
                            self.logger.info(f"✅ 选择选项: {option['content']}")
                            time.sleep(0.5)
                        else:
                            self.logger.warning(f"⚠️ 选择选项失败: {option['content']}")
                        break
            
            self.logger.info(f"✅ 成功选择 {selected_count} 个选项")
            return selected_count > 0
            
        except Exception as e:
            self.logger.error(f"根据内容选择答案失败: {e}")
            return False

    def safe_click_element(self, element, description=""):
        """安全点击元素"""
        max_attempts = 3
        
        for attempt in range(max_attempts):
            try:
                element.click()
                self.logger.info(f"✅ {description} 点击成功")
                return True
            except Exception as e:
                self.logger.warning(f"点击失败 ({attempt + 1}/{max_attempts}): {e}")
                try:
                    self.browser.driver.execute_script("arguments[0].click();", element)
                    self.logger.info(f"✅ {description} JavaScript点击成功")
                    return True
                except Exception as js_e:
                    self.logger.warning(f"JavaScript点击也失败: {js_e}")
                    time.sleep(2)
        
        self.logger.error(f"❌ {description} 所有点击方法都失败")
        return False

    def submit_exam(self):
        """提交试卷"""
        try:
            self.logger.info("准备提交试卷...")
            
            submit_btn = self.browser.driver.find_element(By.CSS_SELECTOR, self.SELECTORS["submit_btn"])
            if self.safe_click_element(submit_btn, "提交试卷"):
                time.sleep(3)
                
                try:
                    confirm_btn = self.browser.driver.find_element(By.XPATH, self.SELECTORS["confirm_submit"])
                    if self.safe_click_element(confirm_btn, "确认提交"):
                        self.logger.info("✅ 试卷提交成功")
                        time.sleep(5)
                        return True
                except Exception:
                    self.logger.info("无需确认，直接提交成功")
                    return True
            
            return False
        except Exception as e:
            self.logger.error(f"提交试卷失败: {e}")
            return False

    def print_question_info(self, question_data):
        """打印题目信息"""
        if not question_data:
            return
        
        question = question_data['question']
        options = question_data['options']
        
        self.logger.info("\n" + "="*80)
        self.logger.info(f"📝 题目信息 (ID: {question['id']})")
        self.logger.info("="*80)
        self.logger.info(f"序号: {question['index']}")
        self.logger.info(f"类型: {question['type']} ({question['type_code']})")
        self.logger.info(f"内容: {question['text']}")
        self.logger.info("-"*40)
        self.logger.info("📋 选项:")
        for option in options:
            status = "✅" if option['is_selected'] else "○"
            self.logger.info(f"  {status} {option['text']} (值: {option['value']})")
        self.logger.info("="*80)

    def update_progress(self, current, total):
        """更新进度信息"""
        self.browser.progress = {
            'current': current,
            'total': total,
            'percentage': round((current / total) * 100) if total > 0 else 0
        }