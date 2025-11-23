import time
import logging

class LearningAutomation:
    def __init__(self, browser_automation):
        self.browser = browser_automation
        self.logger = logging.getLogger(f'learning_{browser_automation.browser_id}')
    
    def start_learning(self):
        """开始刷课流程"""
        try:
            # 驱动断开直接退出
            if not getattr(self.browser, 'is_driver_alive', None) or not self.browser.is_driver_alive():
                self.browser.status = "刷课失败"
                self.browser.current_action = "浏览器未连接或已关闭"
                return False
            self.browser.status = "刷课中"
            self.browser.current_action = "开始检测视频进度"
            
            # 获取视频统计
            stats = self.get_video_statistics()
            if stats['total'] == 0:
                self.browser.current_action = "未找到视频，等待页面加载..."
                time.sleep(10)
                stats = self.get_video_statistics()
                if stats['total'] == 0:
                    self.browser.current_action = "未检测到视频内容"
                    return False
            
            self.update_progress(stats)
            
            max_attempts = self.browser.config.get('max_learning_attempts', 100)
            check_interval = self.browser.config.get('learning_check_interval', 10)
            
            for attempt in range(max_attempts):
                if not self.browser.is_running:
                    break
                if not self.browser.is_driver_alive():
                    self.browser.status = "刷课失败"
                    self.browser.current_action = "浏览器已关闭或驱动断开"
                    break
                
                # 更新统计
                stats = self.get_video_statistics()
                self.update_progress(stats)
                
                self.browser.current_action = f"刷课进度: {stats['completed']}/{stats['total']} ({stats['percentage']}%)"
                
                # 检查是否完成
                if stats['completed'] >= stats['total']:
                    self.browser.status = "刷课完成"
                    self.browser.current_action = "所有课程已完成！"
                    return True
                
                # 执行秒课
                if self.execute_miaoke():
                    self.browser.current_action = f"秒课成功 - 进度: {stats['completed']}/{stats['total']}"
                else:
                    self.browser.current_action = f"秒课失败，等待重试 - 进度: {stats['completed']}/{stats['total']}"
                
                time.sleep(check_interval)
            
            self.browser.status = "刷课完成"
            self.browser.current_action = f"刷课结束 - 最终进度: {self.browser.progress['current']}/{self.browser.progress['total']}"
            return True
            
        except Exception as e:
            self.browser.status = "刷课失败"
            self.browser.current_action = f"刷课过程出错: {str(e)}"
            return False
    
    def get_video_statistics(self):
        """获取视频统计信息"""
        try:
            result = self.browser.driver.execute_script("""
                const videoItems = document.querySelectorAll('.videoList li.title, li.title');
                const videos = [];
                
                for (let i = 0; i < videoItems.length; i++) {
                    const item = videoItems[i];
                    const text = item.textContent || item.innerText;
                    const isCompleted = text.includes('【已完成】');
                    const isIncomplete = text.includes('【未完成】');
                    
                    videos.push({
                        isCompleted: isCompleted,
                        isIncomplete: isIncomplete
                    });
                }
                
                return {
                    total: videos.length,
                    completed: videos.filter(v => v.isCompleted).length,
                    incomplete: videos.filter(v => v.isIncomplete).length
                };
            """)
            
            result['percentage'] = round((result['completed'] / result['total']) * 100) if result['total'] > 0 else 0
            return result
            
        except Exception as e:
            return {'total': 0, 'completed': 0, 'incomplete': 0, 'percentage': 0}
    
    def execute_miaoke(self):
        """执行秒课功能"""
        try:
            result = self.browser.driver.execute_script("""
                const videos = document.querySelectorAll('video');
                if (videos.length === 0) return false;
                
                const video = videos[0];
                if (video.duration && video.duration > 0) {
                    video.currentTime = video.duration - 1;
                    if (video.paused) video.play().catch(() => {});
                    return true;
                }
                return false;
            """)
            return result
        except:
            return False
    
    def update_progress(self, stats):
        """更新进度信息"""
        self.browser.progress = {
            'current': stats['completed'],
            'total': stats['total'],
            'percentage': stats['percentage']
        }