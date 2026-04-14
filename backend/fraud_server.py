import grpc
from concurrent import futures
import time

# These will be generated in Step 2
import fraud_pb2
import fraud_pb2_grpc

class FraudDetectionServicer(fraud_pb2_grpc.FraudServiceServicer):
    
    # Must match the RPC name in your .proto file exactly
    def CheckFraud(self, request, context):
        print(f"🔍 [PYTHON AI] Analyzing transaction:")
        print(f"   -> Amount: {request.amount}")
        print(f"   -> Quantity: {request.quantity}")
        print(f"   -> IP: {request.ip_address}")
        print(f"   -> Recent Orders: {request.recent_orders}")
        
        # Matrix Logic: Block if the amount is suspiciously huge (> 50,000 INR)
        # In a real app, you would run a Machine Learning model here!
        if request.amount > 50000:
            print("🚨 [PYTHON AI] FRAUD DETECTED! High value anomaly.")
            return fraud_pb2.FraudResponse(risk_score=0.95, recommendation="BLOCK")
        else:
            print("✅ [PYTHON AI] Transaction Cleared.")
            return fraud_pb2.FraudResponse(risk_score=0.10, recommendation="ALLOW")

def serve():
    # Start the gRPC server
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    fraud_pb2_grpc.add_FraudServiceServicer_to_server(FraudDetectionServicer(), server)
    
    # Port 50051 is what Java is looking for
    server.add_insecure_port('[::]:50051')
    print("🤖 [PYTHON AI] Fraud Detection Matrix Online on port 50051...")
    server.start()
    
    try:
        while True:
            time.sleep(86400)
    except KeyboardInterrupt:
        server.stop(0)

if __name__ == '__main__':
    serve()