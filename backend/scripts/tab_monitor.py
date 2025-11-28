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
        cfg = getattr(self.browser, 'config', {}) or {}
        interval = int(cfg.get('monitor_interval', 10))
        max_time = int(cfg.get('max_monitor_time', 3600))
        start_ts = time.time()
        
        while self.is_monitoring and self.browser.is_running:
            # 若浏览器驱动已断开，停止监控
            if not getattr(self.browser, 'is_driver_alive', None) or not self.browser.is_driver_alive():
                self.logger.info("浏览器未连接或已关闭，停止监控")
                self.is_monitoring = False
                return None
            # 超时退出监控
            if max_time > 0 and (time.time() - start_ts) > max_time:
                self.logger.info("达到最大监控时间，停止监控")
                self.is_monitoring = False
                return None
            try:
                tab_info = self.check_tabs()
                
                if tab_info:
                    # 找到目标页面，停止监控并处理
                    self.is_monitoring = False
                    return tab_info
                
                # 等待一段时间后继续检查
                remaining = max(1, interval)
                step = 0.5
                while remaining > 0 and self.is_monitoring and self.browser.is_running:
                    time.sleep(step)
                    remaining -= step
                
            except Exception as e:
                self.logger.error(f"监控标签页时出错: {e}")
                # 快速退避等待短时间，避免长时间阻塞
                time.sleep(0.5)
        
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
                try:
                    self.browser.driver.switch_to.window(window)
                    current_url = self.browser.driver.current_url
                    current_title = self.browser.driver.title
                except Exception:
                    # 驱动断开或窗口不可用，立即停止监控，避免持续重试
                    self.browser.status = "已停止"
                    self.browser.current_action = "浏览器已关闭或驱动断开"
                    self.browser.is_running = False
                    self.is_monitoring = False
                    return None
                
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
            # 任意失败视为驱动不可用，安全停止
            self.browser.status = "已停止"
            self.browser.current_action = "浏览器已关闭或驱动断开"
            self.browser.is_running = False
            self.is_monitoring = False
            return None
    
    def is_learning_page(self, url, title):
        """判断是否是学习页面"""
        cfg = getattr(self.browser, 'config', {}) or {}
        learning_keywords = cfg.get('learning_page_keywords', ['在线学习', '学习', '课程', '视频', 'jxjy'])
        url_keywords = cfg.get('learning_url_keywords', ['/jxjy/'])

        u = (url or '').lower()
        t = (title or '').lower()

        # 登录页面排除（避免误判）
        login_url = (cfg.get('login_url') or '').lower()
        if login_url and u.startswith(login_url):
            return False
        if 'login' in u or 'member/login' in u:
            return False

        if any((kw or '').lower() in t for kw in learning_keywords):
            return True
        if any((kw or '').lower() in u for kw in url_keywords):
            return True
        return False

    def is_exam_page(self, url, title):
        """判断是否是考试页面"""
        cfg = getattr(self.browser, 'config', {}) or {}
        exam_keywords = cfg.get('exam_page_keywords', ['考试', '测试', '答题', '试卷'])
        exam_url_keywords = cfg.get('exam_url_keywords', ['/exam/', '/test/'])

        u = (url or '').lower()
        t = (title or '').lower()

        # 登录页面排除（避免误判）
        login_url = (cfg.get('login_url') or '').lower()
        if login_url and u.startswith(login_url):
            return False
        if 'login' in u or 'member/login' in u:
            return False

        if any((kw or '').lower() in t for kw in exam_keywords):
            return True
        if any((kw or '').lower() in u for kw in exam_url_keywords):
            return True
        return False
    
    def stop_monitoring(self):
        """停止监控"""
        self.is_monitoring = False
