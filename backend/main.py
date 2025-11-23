from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import logging
from scripts.browser_manager import BrowserManager

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)

app = Flask(__name__)
CORS(app)  # 允许跨域

# 全局浏览器管理器
manager = BrowserManager()

@app.route('/api/health', methods=['GET'])
def health():
    """健康检查"""
    return jsonify({
        "status": "ok", 
        "service": "Browser Automation API",
        "version": "1.0.0"
    })

@app.route('/api/browsers', methods=['GET'])
def list_browsers():
    """获取所有浏览器实例"""
    status_list = manager.get_all_status()
    return jsonify({
        "success": True,
        "browsers": status_list,
        "total": len(status_list)
    })

@app.route('/api/browsers', methods=['POST'])
def create_browser():
    """创建浏览器实例"""
    try:
        data = request.get_json() or {}
        
        browser_id = manager.create_browser(data.get('config', {}))
        
        return jsonify({
            "success": True,
            "browser_id": browser_id,
            "message": f"浏览器 {browser_id} 创建成功"
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/browsers/<int:browser_id>/start', methods=['POST'])
def start_browser(browser_id):
    """启动浏览器"""
    try:
        success = manager.start_browser(browser_id)
        
        if success:
            return jsonify({
                "success": True,
                "message": f"浏览器 {browser_id} 启动成功"
            })
        else:
            return jsonify({
                "success": False,
                "error": "浏览器不存在"
            }), 404
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/browsers/<int:browser_id>/stop', methods=['POST'])
def stop_browser(browser_id):
    """停止浏览器"""
    try:
        manager.stop_browser(browser_id)
        
        return jsonify({
            "success": True,
            "message": f"浏览器 {browser_id} 停止指令已发送"
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/browsers/<int:browser_id>', methods=['DELETE'])
def remove_browser(browser_id):
    """移除浏览器"""
    try:
        manager.remove_browser(browser_id)
        
        return jsonify({
            "success": True,
            "message": f"浏览器 {browser_id} 已移除"
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/browsers/<int:browser_id>/status', methods=['GET'])
def get_browser_status(browser_id):
    """获取浏览器状态"""
    try:
        status = manager.get_browser_status(browser_id)
        
        if status:
            return jsonify({
                "success": True,
                "status": status
            })
        else:
            return jsonify({
                "success": False,
                "error": "浏览器不存在"
            }), 404
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/browsers/status', methods=['GET'])
def get_all_status():
    """获取所有浏览器状态"""
    try:
        status_list = manager.get_all_status()
        
        return jsonify({
            "success": True,
            "browsers": status_list,
            "total": len(status_list)
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/config', methods=['GET'])
def get_config():
    """获取当前配置"""
    try:
        return jsonify({
            "success": True,
            "config": manager.default_config
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/config', methods=['POST'])
def update_config():
    """更新配置"""
    try:
        data = request.get_json() or {}
        manager.update_config(data)
        
        return jsonify({
            "success": True,
            "message": "配置已更新",
            "config": manager.default_config
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/browsers/stop-all', methods=['POST'])
def stop_all():
    """停止所有浏览器"""
    try:
        manager.stop_all()
        
        return jsonify({
            "success": True,
            "message": "所有浏览器停止指令已发送"
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/question-bank/stats', methods=['GET'])
def get_question_bank_stats():
    """获取题库统计"""
    try:
        # 获取第一个浏览器的题库统计（所有浏览器共享同一个题库文件）
        if manager.browsers:
            first_browser = list(manager.browsers.values())[0]
            stats = first_browser.question_bank.get_stats()
            return jsonify({
                "success": True,
                "stats": stats
            })
        else:
            return jsonify({
                "success": True,
                "stats": {"total_questions": 0, "last_updated": ""}
            })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/logs', methods=['GET'])
def get_logs():
    """获取日志信息（简化版）"""
    try:
        # 这里可以返回最近的操作日志
        logs = []
        for browser_id, browser in manager.browsers.items():
            logs.append({
                "browser_id": browser_id,
                "status": browser.status,
                "current_action": browser.current_action,
                "progress": browser.progress
            })
        
        return jsonify({
            "success": True,
            "logs": logs
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 3001))
    debug = os.getenv('FLASK_DEBUG', 'false').lower() == 'true'
    
    print(f"🚀 启动浏览器自动化服务在端口 {port}")
    print(f"📊 默认配置: {manager.default_config}")
    # 绑定到 0.0.0.0 以便本机与同机不同进程都可访问（Electron/浏览器均可）
    app.run(host='0.0.0.0', port=port, debug=debug)