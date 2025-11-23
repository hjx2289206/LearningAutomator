import threading
import logging
from typing import Dict
from .browser_automation import BrowserAutomation

class BrowserManager:
    def __init__(self):
        self.browsers: Dict[int, BrowserAutomation] = {}
        self.threads: Dict[int, threading.Thread] = {}
        self.next_id = 1
        
        # 完整的默认配置项
        self.default_config = {
            # === 浏览器配置 ===
            'chrome_path': 'resources\\chrome\\chrome.exe',                    # Chrome浏览器路径，空则使用系统默认
            'chromedriver_path': 'resources\\chrome\\chromedriver.exe',  # Chrome驱动路径，空则使用系统默认
            'user_data_dir': 'user_data',         # 用户数据目录
            'browser_timeout': 30,                # 浏览器操作超时时间（秒）
            
            # === 登录配置 ===
            'login_url': 'https://rsjapp.mianyang.cn/jxjy/pc/member/login.jhtml',
            'login_timeout': 600,                 # 登录等待超时时间（秒）
            
            # === 刷课配置 ===
            'max_learning_attempts': 100,         # 最大刷课尝试次数
            'learning_check_interval': 10,        # 刷课检查间隔（秒）
            'miaoke_enabled': True,               # 是否启用秒课功能
            'miaoke_retry_times': 3,              # 秒课重试次数
            'video_load_timeout': 60,             # 视频加载超时时间（秒）
            
            # === 考试配置 ===
            'auto_submit_exam': True,             # 是否自动提交考试
            'exam_answer_delay_min': 2,           # 答题最小延迟（秒）
            'exam_answer_delay_max': 4,           # 答题最大延迟（秒）
            'exam_max_attempts': 3,               # 答题最大尝试次数
            'exam_timeout': 300,                  # 考试超时时间（秒）
            
            # === AI配置 ===
            'enable_ai_assistant': True,          # 是否启用AI助手
            'ai_api_key': '',                     # AI API密钥
            'ai_base_url': 'https://api-inference.modelscope.cn/v1/',  # AI基础URL
            'ai_model': 'deepseek-ai/DeepSeek-V3.1',  # AI模型
            'ai_temperature': 0.1,                # AI温度参数
            'ai_max_tokens': 1000,                # AI最大token数
            'ai_timeout': 30,                     # AI请求超时时间（秒）
            
            # === 题库配置 ===
            'enable_question_bank': True,         # 是否启用题库
            'question_bank_file': 'question_bank.json',  # 题库文件路径
            'auto_save_questions': True,          # 是否自动保存题目到题库
            
            # === 监控配置 ===
            'monitor_interval': 10,               # 标签页监控间隔（秒）
            'max_monitor_time': 3600,             # 最大监控时间（秒）
            'auto_switch_tab': True,              # 是否自动切换标签页
            
            # === 页面检测配置 ===
            'learning_page_keywords': ['在线学习', '学习', '课程', '视频', 'jxjy'],
            'learning_url_keywords': ['/jxjy/', '/pc/'],
            'exam_page_keywords': ['考试', '测试', '答题', '试卷'],
            'exam_url_keywords': ['/exam/', '/test/'],
            
            # === 安全配置 ===
            'enable_stealth_mode': True,          # 是否启用隐身模式（反检测）
            'random_delay': True,                 # 是否启用随机延迟
            'max_retry_count': 3,                 # 最大重试次数
            
            # === 性能配置 ===
            'page_load_timeout': 30,              # 页面加载超时（秒）
            'script_timeout': 10,                 # 脚本执行超时（秒）
            'implicit_wait': 5,                   # 隐式等待时间（秒）
            
            # === 日志配置 ===
            'log_level': 'INFO',                  # 日志级别
            'enable_console_log': True,           # 是否启用控制台日志
            'enable_file_log': False,             # 是否启用文件日志
            'log_file': 'automation.log',         # 日志文件路径
            'log_max_size': 10,                   # 日志文件最大大小（MB）
            
            # === 高级配置 ===
            'headless_mode': False,               # 是否无头模式（调试时可关闭）
            'disable_images': False,              # 是否禁用图片加载
            'disable_javascript': False,          # 是否禁用JavaScript（一般不推荐）
            'user_agent': '',                     # 自定义User-Agent，空则使用默认
            'window_size': '1200,800',            # 浏览器窗口大小
        }
        
        # 设置日志
        logging.basicConfig(
            level=getattr(logging, self.default_config['log_level']),
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[logging.StreamHandler()]
        )
        self.logger = logging.getLogger('browser_manager')
        self.logger.info("✅ 浏览器管理器初始化完成")

        # 共享题库实例（所有浏览器共用同一个题库）
        from .question_bank import QuestionBank
        self.question_bank = QuestionBank(self.default_config.get('question_bank_file', 'question_bank.json'))

    def create_browser(self, config=None):
        """创建浏览器实例"""
        browser_id = self.next_id
        self.next_id += 1
        
        # 合并配置
        final_config = self.default_config.copy()
        if config:
            final_config.update(config)
        
        # 创建浏览器实例
        browser = BrowserAutomation(browser_id, final_config, question_bank=self.question_bank)
        self.browsers[browser_id] = browser
        
        self.logger.info(f"✅ 创建浏览器实例 {browser_id}")
        return browser_id

    def start_browser(self, browser_id):
        """启动浏览器运行"""
        if browser_id not in self.browsers:
            self.logger.error(f"❌ 浏览器 {browser_id} 不存在")
            return False
        
        browser = self.browsers[browser_id]
        
        def run():
            try:
                browser.start_automation()
            except Exception as e:
                self.logger.error(f"❌ 浏览器 {browser_id} 运行失败: {e}")
        
        # 在新线程中运行
        thread = threading.Thread(target=run, daemon=True, name=f"browser_{browser_id}")
        self.threads[browser_id] = thread
        thread.start()
        
        self.logger.info(f"✅ 启动浏览器 {browser_id}")
        return True

    def stop_browser(self, browser_id):
        """停止浏览器"""
        if browser_id in self.browsers:
            self.browsers[browser_id].stop()
            self.logger.info(f"✅ 停止浏览器 {browser_id}")

    def remove_browser(self, browser_id):
        """移除浏览器"""
        self.stop_browser(browser_id)
        if browser_id in self.browsers:
            del self.browsers[browser_id]
        if browser_id in self.threads:
            del self.threads[browser_id]
        self.logger.info(f"✅ 移除浏览器 {browser_id}")

    def get_browser_status(self, browser_id):
        """获取浏览器状态"""
        if browser_id in self.browsers:
            try:
                return self.browsers[browser_id].get_status()
            except Exception as e:
                # 当单个实例状态获取失败时，返回一个安全的错误状态而不是抛出异常
                self.logger.warning(f"⚠️ 获取浏览器 {browser_id} 状态失败: {e}")
                return {
                    'browser_id': browser_id,
                    'status': '错误',
                    'current_action': f'状态获取失败: {str(e)}',
                    'progress': None,
                    'current_url': None,
                    'title': None,
                }
        return None

    def get_all_status(self):
        """获取所有浏览器状态"""
        status_list = []
        for browser_id in self.browsers:
            status = self.get_browser_status(browser_id)
            if status:
                status_list.append(status)
        return status_list

    def update_config(self, new_config):
        """更新默认配置（不影响已创建的浏览器实例）"""
        old_config = self.default_config.copy()
        self.default_config.update(new_config)
        
        # 记录配置变更
        changed_keys = []
        for key in new_config:
            if old_config.get(key) != new_config.get(key):
                changed_keys.append(key)
        
        if changed_keys:
            self.logger.info(f"📝 配置已更新: {', '.join(changed_keys)}")

    def stop_all(self):
        """停止所有浏览器"""
        self.logger.info("🛑 停止所有浏览器...")
        for browser_id in list(self.browsers.keys()):
            self.stop_browser(browser_id)

    def get_stats(self):
        """获取管理器统计信息"""
        return {
            'total_browsers': len(self.browsers),
            'running_browsers': len([b for b in self.browsers.values() if b.is_running]),
            'next_browser_id': self.next_id,
            'config_keys': len(self.default_config)
        }