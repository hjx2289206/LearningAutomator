import os
import json
import time
import logging
import re

class QuestionBank:
    def __init__(self, data_file="question_bank.json"):
        self.questions_file = data_file
        self.logger = logging.getLogger('question_bank')
        self.load_questions()
    
    def load_questions(self):
        """加载题库"""
        try:
            if os.path.exists(self.questions_file):
                with open(self.questions_file, 'r', encoding='utf-8') as f:
                    self.questions = json.load(f)
                self.logger.info(f"✅ 题库加载成功，共 {len(self.questions)} 道题目")
            else:
                self.questions = {}
                self.logger.info("📝 创建新题库")
        except Exception as e:
            self.logger.error(f"❌ 题库加载失败: {e}")
            self.questions = {}
    
    def save_questions(self):
        """保存题库到文件"""
        try:
            with open(self.questions_file, 'w', encoding='utf-8') as f:
                json.dump(self.questions, f, ensure_ascii=False, indent=2)
            self.logger.info(f"💾 题库保存成功，共 {len(self.questions)} 道题目")
        except Exception as e:
            self.logger.error(f"❌ 题库保存失败: {e}")
    
    def find_answer(self, question_text, options, question_type):
        """在题库中查找答案（返回选项内容）"""
        # 简化题目文本用于匹配
        simplified_text = self.simplify_question_text(question_text)
        
        # 在题库中查找
        for qid, question_data in self.questions.items():
            if self.is_similar_question(question_data.get('simplified_text', ''), simplified_text):
                self.logger.info(f"🎯 在题库中找到匹配题目: {qid}")
                return question_data.get('answer')  # 返回选项内容
        
        self.logger.info("❓ 题库中未找到匹配题目")
        return None
    
    def add_question(self, question_info, options, answer_content):
        """添加题目到题库（保存选项内容）"""
        question_id = question_info['id']
        
        # 清理选项数据
        cleaned_options = []
        for option in options:
            cleaned_option = {
                "content": option.get('content'),
                "text": option.get('text'),
                "value": option.get('value')
            }
            cleaned_options.append(cleaned_option)
        
        # 构建题目数据
        question_data = {
            'text': question_info['text'],
            'simplified_text': self.simplify_question_text(question_info['text']),
            'type': question_info['type'],
            'options': cleaned_options,
            'answer': answer_content,  # 保存选项内容
            'add_time': time.strftime("%Y-%m-%d %H:%M:%S")
        }
        
        self.questions[question_id] = question_data
        self.save_questions()
        self.logger.info(f"📝 题目已添加到题库: {question_id}")
    
    def simplify_question_text(self, text):
        """简化题目文本，去除标点、空格等"""
        # 去除标点符号和空格
        simplified = re.sub(r'[^\w\u4e00-\u9fff]', '', text)
        return simplified
    
    def is_similar_question(self, text1, text2):
        """判断两个题目是否相似"""
        # 简单的相似度判断
        return text1 == text2 or text1 in text2 or text2 in text1
    
    def get_stats(self):
        """获取题库统计"""
        return {
            'total_questions': len(self.questions),
            'last_updated': time.strftime("%Y-%m-%d %H:%M:%S")
        }