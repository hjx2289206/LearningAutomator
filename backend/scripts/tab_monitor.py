import time
import logging

class TabMonitor:
    def __init__(self, browser_automation):
        self.browser = browser_automation
        self.is_monitoring = False
        self.logger = logging.getLogger(f'tab_monitor_{browser_automation.browser_id}')
    
    def start_monitoring(self):
        """开始监控标签页"""
        self.is_monitoring = True
        self.logger.info("开始监控标签页...")
        
        while self.is_monitoring and self.browser.is_running:
            # 若浏览器驱动已断开，停止监控
            if not getattr(self.browser, 'is_driver_alive', None) or not self.browser.is_driver_alive():
                self.logger.info("浏览器未连接或已关闭，停止监控")
                self.is_monitoring = False
                return None
            try:
                tab_info = self.check_tabs()
                
                if tab_info:
                    # 找到目标页面，停止监控并处理
                    self.is_monitoring = False
                    return tab_info
                
                # 等待一段时间后继续检查
                time.sleep(10)  # 每10秒检查一次
                
            except Exception as e:
                self.logger.error(f"监控标签页时出错: {e}")
                time.sleep(10)
        
        return None
    
    def check_tabs(self):
        """检查所有标签页，返回找到的目标页面信息"""
        # 驱动不可用时直接返回
        if not getattr(self.browser, 'is_driver_alive', None) or not self.browser.is_driver_alive():
            return None
        try:
            original_window = self.browser.driver.current_window_handle
            learning_tabs = []
            exam_tabs = []
            
            for window in self.browser.driver.window_handles:
                self.browser.driver.switch_to.window(window)
                current_url = self.browser.driver.current_url
                current_title = self.browser.driver.title
                
                # 检查学习页面
                if self.is_learning_page(current_url, current_title):
                    learning_tabs.append({
                        'window': window,
                        'url': current_url,
                        'title': current_title,
                        'type': 'learning'
                    })
                
                # 检查考试页面
                if self.is_exam_page(current_url, current_title):
                    exam_tabs.append({
                        'window': window,
                        'url': current_url,
                        'title': current_title,
                        'type': 'exam'
                    })
            
            # 切换回原始窗口
            self.browser.driver.switch_to.window(original_window)
            
            # 优先返回考试页面，其次学习页面
            if exam_tabs:
                self.logger.info(f"检测到考试页面: {exam_tabs[0]['title']}")
                return exam_tabs[0]
            elif learning_tabs:
                self.logger.info(f"检测到学习页面: {learning_tabs[0]['title']}")
                return learning_tabs[0]
            else:
                self.browser.current_action = "监控中...未检测到学习或考试页面"
                return None
                
        except Exception as e:
            self.logger.error(f"检查标签页失败: {e}")
            return None
    
    def is_learning_page(self, url, title):
        """判断是否是学习页面"""
        learning_keywords = ['在线学习', '学习', '课程', '视频', 'jxjy']
        url_keywords = ['/jxjy/', '/pc/']
        
        if any(keyword in title for keyword in learning_keywords):
            return True
        if any(keyword in url for keyword in url_keywords):
            return True
        return False

    def is_exam_page(self, url, title):
        """判断是否是考试页面"""
        exam_keywords = ['考试', '测试', '答题', '试卷']
        
        if any(keyword in title for keyword in exam_keywords):
            return True
        if any(keyword in url for keyword in ['/exam/', '/test/']):
            return True
        return False
    
    def stop_monitoring(self):
        """停止监控"""
        self.is_monitoring = False