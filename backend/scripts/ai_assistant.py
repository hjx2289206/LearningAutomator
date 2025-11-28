import re
import logging
from openai import OpenAI

class AIAssistant:
    def __init__(self, api_key, base_url="https://api-inference.modelscope.cn/v1/", model="deepseek-ai/DeepSeek-V3.1", temperature=0.1, max_tokens=1000):
        self.client = OpenAI(api_key=api_key, base_url=base_url)
        self.logger = logging.getLogger('ai_assistant')
        self.model = model
        self.temperature = temperature
        self.max_tokens = max_tokens
        self.logger.info("✅ AI助手初始化完成")
    
    def extract_choice_intelligent(self, answer_text, question_type="single"):
        """智能提取选项，支持单选和多选题"""
        
        if question_type == "single":
            # 单选题匹配模式
            patterns = [
                r'答案[是：:\s]*([ABCD])',           # 答案：A
                r'选项[是：:\s]*([ABCD])',           # 选项是A
                r'选择[：:\s]*([ABCD])',             # 选择：A
                r'正确答案[是：:\s]*([ABCD])',       # 正确答案是A
                r'^[^ABCD]*([ABCD])[^ABCD]*$',      # 文本中包含单个选项字母
                r'\b([ABCD])\b',                    # 独立的选项字母
            ]
            
            for pattern in patterns:
                match = re.search(pattern, answer_text, re.IGNORECASE)
                if match:
                    return match.group(1).upper()
        
        elif question_type == "multiple":
            # 多选题匹配模式
            patterns = [
                r'答案[是：:\s]*([ABCD,]+)',           # 答案：A,B
                r'选项[是：:\s]*([ABCD,]+)',           # 选项是A,C
                r'选择[：:\s]*([ABCD,]+)',             # 选择：A,B,C
                r'正确答案[是：:\s]*([ABCD,]+)',       # 正确答案是A,B
                r'([ABCD][,ABCD]*)',                   # 直接匹配选项组合
            ]
            
            for pattern in patterns:
                match = re.search(pattern, answer_text, re.IGNORECASE)
                if match:
                    # 去重并排序
                    choices = list(set(match.group(1).upper().replace(',', '')))
                    choices.sort()
                    return ','.join(choices)
        
        return None

    def ask_with_structured_prompt(self, question, options, question_type):
        """使用结构化提示词确保AI规范回答"""
        options_text = "\n".join([f"{chr(65+i)}. {opt['content']}" for i, opt in enumerate(options)])
        
        answer_format = "X（X为A、B、C、D中的一个）" if question_type == "single" else "X,Y（如A,C或A,B,C）"
        
        prompt = f'''请回答以下选择题，并严格按照要求格式回复：

题目：{question}

选项：
{options_text}

要求：
1. 先分析问题
2. 然后给出你的推理过程
3. 最后一行必须单独写：答案：{answer_format}

请确保最后一行格式为"答案：X"'''
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        'role': 'system',
                        'content': '你是一个选择题答题专家，请严格按照要求的格式回答问题。'
                    },
                    {
                        'role': 'user',
                        'content': prompt
                    }
                ],
                temperature=self.temperature,
                max_tokens=self.max_tokens
            )
            
            answer = response.choices[0].message.content
            choice = self.extract_choice_intelligent(answer, question_type)
            
            return choice, answer
            
        except Exception as e:
            self.logger.error(f"❌ AI调用失败: {e}")
            return None, None

    def get_ai_answer(self, question_info, options):
        """获取AI答案并转换为选项内容"""
        question_text = question_info['text']
        question_type = "single" if question_info['type'] == "radio" else "multiple"
        
        self.logger.info(f"🤖 向AI提问: {question_text[:50]}...")
        
        choice_letters, full_answer = self.ask_with_structured_prompt(
            question_text, options, question_type
        )
        
        if not choice_letters:
            self.logger.warning("❌ 无法从AI回答中提取选项")
            return None
        
        # 将选项字母转换为对应的选项内容
        option_contents = []
        for letter in choice_letters.replace(',', ''):
            index = ord(letter) - 65  # A->0, B->1, etc.
            if 0 <= index < len(options):
                option_contents.append(options[index]['content'])
        
        if not option_contents:
            self.logger.warning("❌ 无法将选项字母映射到选项内容")
            return None
        
        answer_content = ",".join(option_contents) if question_type == "multiple" else option_contents[0]
        self.logger.info(f"✅ AI答案转换: {choice_letters} -> {answer_content}")
        
        return answer_content
