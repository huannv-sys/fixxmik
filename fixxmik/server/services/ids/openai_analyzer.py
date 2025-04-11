import json
import os
import sys
from typing import Dict, List, Any, Optional, Tuple

# the newest OpenAI model is "gpt-4o" which was released May 13, 2024.
# do not change this unless explicitly requested by the user
from openai import OpenAI

# Cấu hình OpenAI API
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    print("OPENAI_API_KEY not found in environment variables", file=sys.stderr)

openai = OpenAI(api_key=OPENAI_API_KEY)

class OpenAINetworkAnalyzer:
    """
    Sử dụng OpenAI API để phân tích dữ liệu mạng và phát hiện các hoạt động bất thường
    """
    
    def __init__(self):
        if not OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY không được cấu hình")
        
        # Khởi tạo bộ phân tích với các mẫu tấn công phổ biến
        self.attack_patterns = {
            "port_scan": "Nhiều kết nối đến các cổng khác nhau từ một địa chỉ IP trong thời gian ngắn",
            "ddos": "Số lượng lớn kết nối đến một địa chỉ IP/cổng cụ thể trong thời gian ngắn",
            "brute_force": "Nhiều lần thử kết nối không thành công đến các dịch vụ xác thực",
            "data_exfiltration": "Lưu lượng upload bất thường từ một địa chỉ IP nội bộ",
            "malware_c2": "Kết nối đều đặn đến địa chỉ IP không xác định với mẫu thời gian cố định"
        }
    
    async def analyze_traffic_patterns(self, traffic_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Phân tích mẫu lưu lượng mạng bằng OpenAI API để phát hiện bất thường
        """
        # Chuẩn bị dữ liệu để gửi đến OpenAI API
        prompt = self._prepare_analysis_prompt(traffic_data)
        
        try:
            # Gọi OpenAI API để phân tích
            response = openai.chat.completions.create(
                model="gpt-4o", 
                messages=[
                    {"role": "system", "content": "Bạn là chuyên gia phân tích bảo mật mạng. Nhiệm vụ của bạn là phân tích dữ liệu mạng để phát hiện các hoạt động bất thường hoặc độc hại. Trả về kết quả phân tích chi tiết, bao gồm mức độ tin cậy và loại bất thường nếu có. Phản hồi là JSON."},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"}
            )
            
            # Phân tích kết quả trả về
            analysis_result = json.loads(response.choices[0].message.content)
            
            # Thêm thông tin phiên bản mô hình và timestamp
            analysis_result["model_version"] = "gpt-4o"
            
            return analysis_result
        
        except Exception as e:
            print(f"Error during OpenAI analysis: {str(e)}", file=sys.stderr)
            return {
                "error": str(e),
                "anomaly_detected": False,
                "confidence": 0,
                "analysis": "Không thể phân tích do lỗi API"
            }
    
    async def classify_network_activity(self, connection_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Phân loại hoạt động mạng dựa trên dữ liệu kết nối
        """
        try:
            # Chuẩn bị dữ liệu kết nối để phân tích
            connections_json = json.dumps(connection_data, indent=2)
            prompt = f"""
            Phân tích dữ liệu kết nối mạng dưới đây và phân loại hoạt động:
            
            {connections_json}
            
            Xác định:
            1. Có hoạt động bất thường không?
            2. Loại hoạt động (thông thường/đáng ngờ/độc hại)
            3. Mô tả về mẫu lưu lượng
            4. Mức độ nghiêm trọng (thấp/trung bình/cao) nếu phát hiện bất thường
            5. Đề xuất hành động (giám sát/điều tra/chặn)
            
            Trả về kết quả dưới dạng JSON có cấu trúc như sau:
            {{"classification": string, "anomaly_detected": boolean, "pattern_description": string, "severity": string, "recommended_action": string, "confidence": number}}
            """
            
            response = openai.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "Bạn là chuyên gia phân tích bảo mật mạng chuyên phát hiện các hoạt động bất thường. Hãy trả về phân tích chính xác dưới dạng JSON."},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response.choices[0].message.content)
            return result
            
        except Exception as e:
            print(f"Error during traffic classification: {str(e)}", file=sys.stderr)
            return {
                "classification": "unknown",
                "anomaly_detected": False,
                "pattern_description": f"Lỗi phân tích: {str(e)}",
                "severity": "unknown",
                "recommended_action": "review_manually",
                "confidence": 0
            }
    
    async def analyze_packet_capture(self, packet_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Phân tích dữ liệu bắt gói tin chi tiết để phát hiện các kỹ thuật tấn công tinh vi
        """
        try:
            # Chuẩn bị dữ liệu gói tin để phân tích
            packet_summary = self._prepare_packet_summary(packet_data)
            
            prompt = f"""
            Phân tích tóm tắt gói tin sau để phát hiện các kỹ thuật tấn công tiềm ẩn:
            
            {packet_summary}
            
            Xác định:
            1. Có các mẫu gói tin bất thường không
            2. Có dấu hiệu của các kỹ thuật tấn công phổ biến không (injection, overflow, tunneling, etc.)
            3. Dữ liệu đáng ngờ trong payload
            4. Dấu hiệu của các công cụ tấn công hoặc malware đã biết
            
            Trả về kết quả là JSON
            """
            
            response = openai.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "Bạn là chuyên gia phân tích dữ liệu gói tin mạng chuyên sâu. Hãy cung cấp phân tích chi tiết dưới dạng JSON."},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response.choices[0].message.content)
            return result
            
        except Exception as e:
            print(f"Error during packet analysis: {str(e)}", file=sys.stderr)
            return {
                "error": str(e),
                "threats_detected": False,
                "analysis": "Không thể phân tích chi tiết gói tin do lỗi"
            }
    
    async def generate_threat_report(self, analysis_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Tạo báo cáo mối đe dọa dựa trên dữ liệu phân tích
        """
        try:
            report_prompt = f"""
            Dựa trên dữ liệu phân tích bảo mật sau:
            
            {json.dumps(analysis_data, indent=2)}
            
            Tạo một báo cáo đe dọa bảo mật bao gồm:
            1. Tóm tắt phát hiện chính
            2. Đánh giá mức độ rủi ro tổng thể
            3. Mô tả chi tiết về mỗi mối đe dọa tiềm ẩn
            4. Đề xuất biện pháp khắc phục
            5. Hướng dẫn để ngăn chặn trong tương lai
            
            Trả về báo cáo dưới dạng JSON với các trường: summary, risk_level, detailed_findings, remediation_steps, prevention_guidance
            """
            
            response = openai.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "Bạn là chuyên gia phân tích đe dọa bảo mật mạng. Tạo báo cáo đe dọa chuyên nghiệp dưới dạng JSON."},
                    {"role": "user", "content": report_prompt}
                ],
                response_format={"type": "json_object"}
            )
            
            report = json.loads(response.choices[0].message.content)
            return report
            
        except Exception as e:
            print(f"Error generating threat report: {str(e)}", file=sys.stderr)
            return {
                "summary": f"Không thể tạo báo cáo do lỗi: {str(e)}",
                "risk_level": "unknown",
                "detailed_findings": [],
                "remediation_steps": ["Kiểm tra lại dữ liệu đầu vào"],
                "prevention_guidance": ["Đảm bảo dữ liệu phân tích đúng định dạng"]
            }
    
    def _prepare_analysis_prompt(self, traffic_data: Dict[str, Any]) -> str:
        """
        Chuẩn bị prompt để gửi đến OpenAI API
        """
        # Chuyển đổi dữ liệu lưu lượng thành chuỗi JSON để đưa vào prompt
        traffic_json = json.dumps(traffic_data, indent=2)
        
        prompt = f"""
        Phân tích dữ liệu lưu lượng mạng sau để phát hiện các hoạt động bất thường:
        
        {traffic_json}
        
        Các loại tấn công phổ biến cần chú ý:
        - Port Scanning: {self.attack_patterns['port_scan']}
        - DDoS: {self.attack_patterns['ddos']}
        - Brute Force: {self.attack_patterns['brute_force']}
        - Data Exfiltration: {self.attack_patterns['data_exfiltration']}
        - C2 Communication: {self.attack_patterns['malware_c2']}
        
        Hãy phân tích chi tiết và trả về kết quả dưới dạng JSON với cấu trúc sau:
        {{"anomaly_detected": boolean, "confidence": number, "anomaly_type": string, "description": string, "severity": string, "source_ips": [string], "target_ips": [string], "recommended_action": string}}
        """
        
        return prompt
    
    def _prepare_packet_summary(self, packet_data: List[Dict[str, Any]]) -> str:
        """
        Tạo tóm tắt từ dữ liệu gói tin để phân tích
        """
        # Chỉ lấy tối đa 100 gói tin để tránh vượt quá giới hạn token
        sample_packets = packet_data[:100]
        
        # Tính toán thống kê cơ bản
        protocol_counts = {}
        sources = {}
        destinations = {}
        
        for packet in sample_packets:
            # Đếm theo giao thức
            protocol = packet.get("protocol", "unknown")
            protocol_counts[protocol] = protocol_counts.get(protocol, 0) + 1
            
            # Đếm theo nguồn
            src = packet.get("src_ip", "unknown")
            sources[src] = sources.get(src, 0) + 1
            
            # Đếm theo đích
            dst = packet.get("dst_ip", "unknown")
            destinations[dst] = destinations.get(dst, 0) + 1
        
        # Tạo tóm tắt
        summary = {
            "sample_size": len(sample_packets),
            "protocol_distribution": protocol_counts,
            "top_sources": dict(sorted(sources.items(), key=lambda x: x[1], reverse=True)[:10]),
            "top_destinations": dict(sorted(destinations.items(), key=lambda x: x[1], reverse=True)[:10]),
            "sample_packets": sample_packets[:20]  # Chỉ gửi 20 gói tin đầu tiên
        }
        
        return json.dumps(summary, indent=2)

# Hàm để khởi tạo trình phân tích OpenAI
def create_openai_analyzer() -> Optional[OpenAINetworkAnalyzer]:
    try:
        return OpenAINetworkAnalyzer()
    except Exception as e:
        print(f"Error creating OpenAI Network Analyzer: {str(e)}", file=sys.stderr)
        return None