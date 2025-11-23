import os
import time
import threading
import json
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By

from .tab_monitor import TabMonitor
from .learning_automation import LearningAutomation
from .exam_automation import ExamAutomation
from .ai_assistant import AIAssistant
from .question_bank import QuestionBank

class BrowserAutomation:
    def __init__(self, browser_id=1, config=None, question_bank=None):
        self.driver = None
        self.browser_id = browser_id
        self.config = config or {}
        self.status = "未启动"
        self.progress = {"current": 0, "total": 0, "percentage": 0}
        self.current_action = ""
        self.is_running = False
        
        # 初始化模块
        self.tab_monitor = TabMonitor(self)
        self.learning_automation = LearningAutomation(self)
        self.exam_automation = ExamAutomation(self)
        
        # 初始化AI和题库
        self.ai_assistant = None
        if self.config.get('ai_api_key'):
            self.ai_assistant = AIAssistant(self.config['ai_api_key'])
        
        # 题库改为可共享的实例，未传入则使用默认文件
        if question_bank is not None:
            self.question_bank = question_bank
        else:
            from .question_bank import QuestionBank
            self.question_bank = QuestionBank(self.config.get('question_bank_file', 'question_bank.json'))
    
    def setup_driver(self):
        """启动浏览器"""
        try:
            self.status = "启动中"
            self.current_action = "正在启动浏览器"
            
            chrome_options = Options()
            
            # 基础配置
            chrome_options.add_argument('--no-sandbox')
            chrome_options.add_argument('--disable-dev-shm-usage')
            chrome_options.add_argument('--start-maximized')
            chrome_options.add_argument('--disable-blink-features=AutomationControlled')
            chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
            chrome_options.add_experimental_option('useAutomationExtension', False)
            
            # 用户数据目录
            user_data_dir = os.path.join(os.getcwd(), "user_data", f"profile_{self.browser_id}")
            if not os.path.exists(user_data_dir):
                os.makedirs(user_data_dir)
            
            chrome_options.add_argument(f'--user-data-dir={user_data_dir}')
            
            # 自定义 Chrome 路径
            if self.config.get('chrome_path'):
                chrome_options.binary_location = self.config['chrome_path']
            
            # 启动浏览器
            chromedriver_path = self.config.get('chromedriver_path')
            service = Service(executable_path=chromedriver_path) if chromedriver_path else None
            self.driver = webdriver.Chrome(service=service, options=chrome_options)
            self.driver.set_page_load_timeout(30)
            # 设置窗口为横屏尺寸（如有配置）
            try:
                ws = self.config.get('window_size', '1200,800')
                parts = [int(p.strip()) for p in ws.split(',')]
                if len(parts) == 2:
                    self.driver.set_window_size(parts[0], parts[1])
            except Exception:
                pass
            
            self.status = "已启动"
            self.current_action = "浏览器启动完成"
            self.is_running = True
            return True
            
        except Exception as e:
            self.status = "启动失败"
            self.current_action = f"启动失败: {str(e)}"
            return False
    
    def open_login_page(self):
        """打开登录页面"""
        try:
            self.current_action = "正在打开登录页面"
            login_url = self.config.get('login_url', 'https://rsjapp.mianyang.cn/jxjy/pc/member/login.jhtml')
            self.driver.get(login_url)
            self.status = "等待登录"
            self.current_action = "请完成登录，登录后程序会自动检测学习/考试页面"
            return True
        except Exception as e:
            self.current_action = f"打开登录页面失败: {str(e)}"
            return False
    
    def switch_to_tab(self, tab_info):
        """切换到指定标签页"""
        try:
            self.driver.switch_to.window(tab_info['window'])
            self.current_action = f"已切换到{tab_info['type']}页面: {tab_info['title']}"
            return True
        except Exception as e:
            self.current_action = f"切换标签页失败: {e}"
            return False
    
    def start_automation(self):
        """开始自动化流程"""
        if not self.setup_driver():
            return False
        
        # 打开登录页面
        self.open_login_page()
        
        # 在主线程中运行主循环
        def main_loop():
            while self.is_running:
                try:
                    # 若驱动已断开，安全停止并退出主循环
                    if not self.is_driver_alive():
                        self.status = "已停止"
                        self.current_action = "浏览器已关闭或驱动断开"
                        self.is_running = False
                        self.tab_monitor.stop_monitoring()
                        break
                    # 1. 监控标签页，寻找目标页面
                    self.status = "监控中"
                    tab_info = self.tab_monitor.start_monitoring()
                    
                    if not tab_info or not self.is_running:
                        break
                    
                    # 2. 切换到目标页面
                    if not self.switch_to_tab(tab_info):
                        continue
                    
                    # 3. 根据页面类型执行相应操作
                    if tab_info['type'] == 'learning':
                        self.learning_automation.start_learning()
                    elif tab_info['type'] == 'exam':
                        self.exam_automation.start_exam()
                    
                    # 4. 任务完成后，继续监控
                    if self.is_running:
                        self.status = "任务完成，继续监控"
                        self.current_action = "等待新的学习或考试页面"
                        time.sleep(5)  # 短暂休息后继续监控
                        
                except Exception as e:
                    self.current_action = f"主循环出错: {str(e)}"
                    time.sleep(10)  # 出错后等待一段时间再继续
        
        # 在后台线程中运行主循环
        main_thread = threading.Thread(target=main_loop, daemon=True)
        main_thread.start()
        
        return True
    
    def stop(self):
        """停止自动化"""
        self.is_running = False
        self.tab_monitor.stop_monitoring()
        self.status = "已停止"
        self.current_action = "用户手动停止"
        if self.driver:
            try:
                self.driver.quit()
            except:
                pass
        # 置空 driver，避免后续误用
        self.driver = None

    def is_driver_alive(self):
        """检查 WebDriver 是否仍然可用/连接正常"""
        if not self.driver:
            return False
        try:
            _ = self.driver.title
            return True
        except Exception:
            return False
    
    def get_status(self):
        """获取当前状态"""
        current_url = None
        title = None
        # 即使 self.driver 存在，也可能已断连或驱动已退出，访问属性会抛异常
        if self.driver:
            try:
                current_url = self.driver.current_url
            except Exception:
                current_url = None
            try:
                title = self.driver.title
            except Exception:
                title = None

        return {
            'browser_id': self.browser_id,
            'status': self.status,
            'current_action': self.current_action,
            'progress': self.progress,
            'current_url': current_url,
            'title': title,
        }