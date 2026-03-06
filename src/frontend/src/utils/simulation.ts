import { IncidentStatus } from "../hooks/useQueries";

const errorTypes = [
  "NullPointerException",
  "KeyError",
  "TypeError",
  "IndexError",
  "DatabaseConnectionError",
  "TimeoutError",
];

const filePaths = [
  "src/api/user_handler.py",
  "src/db/connection.py",
  "src/services/auth.py",
  "src/utils/parser.py",
  "src/models/order.py",
];

const errorMessages = [
  "'NoneType' object has no attribute 'user_id'",
  "KeyError: 'email' not found in request body",
  "list index out of range at index 0",
  "Connection timeout after 30s retrying",
  "TypeError: unsupported operand type(s) for +: 'NoneType' and 'int'",
  "IndexError: list assignment index out of range",
];

const rcaSummaries: Record<string, string> = {
  NullPointerException:
    "Root Cause: The user_handler.py endpoint receives an optional user payload from the upstream auth middleware, but does not check if the object is None before accessing its attributes.\n\nIn function process_user_request() at line 47, the code directly calls payload.user_id without a null guard. When an unauthenticated request reaches this endpoint (e.g., after a JWT expiry race condition), payload is None, causing the AttributeError.\n\nSeverity: HIGH — affects all unauthenticated requests during session refresh windows.",
  KeyError:
    "Root Cause: The auth service expects the 'email' field in the request JSON body. However, the client SDK v2.3.1 changed the field name to 'emailAddress' without updating the server-side handler.\n\nIn validate_credentials() at line 23, the code uses request_body['email'] without using .get() for safe access. This breaks all login attempts from SDK v2.3.1+ clients.\n\nSeverity: CRITICAL — blocks 100% of new client logins.",
  TypeError:
    "Root Cause: The parser utility function aggregate_scores() accumulates numeric scores from a list, but the database occasionally returns None for missing score fields instead of 0.\n\nThe sum operation at line 89 fails when None is included in the arithmetic. This occurs approximately 3% of requests where users have incomplete profiles.\n\nSeverity: MEDIUM — intermittent failures affect 3% of users.",
  IndexError:
    "Root Cause: The order model's get_latest_items() method assumes the result list has at least one element. When a new user with no order history calls this endpoint, an empty list is returned and index [0] raises IndexError.\n\nSeverity: LOW — affects new user onboarding flow only.",
  DatabaseConnectionError:
    "Root Cause: Connection pool exhaustion detected. The DB connection pool (max=20) is being saturated during peak hours due to long-running transactions in the reporting module that hold connections without proper cleanup.\n\nConnections are not being returned on exception paths — missing finally block in report_generator.py.\n\nSeverity: CRITICAL — cascading failure affecting entire API surface.",
  TimeoutError:
    "Root Cause: The external payment gateway API is experiencing elevated latency (avg 28s vs normal 2s). The client timeout is set to 30s which is too close to the gateway P99 latency.\n\nAdditionally, there is no retry logic with exponential backoff implemented, causing all retries to immediately hit the same overloaded endpoint.\n\nSeverity: HIGH — affects all payment processing requests.",
};

const patchCodes: Record<string, string> = {
  NullPointerException:
    '--- a/src/api/user_handler.py\n+++ b/src/api/user_handler.py\n@@ -44,7 +44,12 @@ class UserHandler:\n \n     def process_user_request(self, request):\n         payload = self.auth_middleware.get_payload(request)\n-        user_id = payload.user_id\n-        return self.db.get_user(user_id)\n+        if payload is None:\n+            logger.warning("Received request with null payload")\n+            raise HTTPException(\n+                status_code=401,\n+                detail="Authentication required"\n+            )\n+        user_id = payload.user_id\n+        return self.db.get_user(user_id)',

  KeyError:
    "--- a/src/services/auth.py\n+++ b/src/services/auth.py\n@@ -20,7 +20,12 @@ class AuthService:\n \n     def validate_credentials(self, request_body: dict):\n-        email = request_body['email']\n-        password = request_body['password']\n+        # Support both legacy 'email' and new SDK 'emailAddress' field\n+        email = (\n+            request_body.get('email') or\n+            request_body.get('emailAddress')\n+        )\n+        if not email:\n+            raise ValidationError(\"Email field is required\")\n+        password = request_body.get('password', '')\n         return self._check_credentials(email, password)",

  TypeError:
    "--- a/src/utils/parser.py\n+++ b/src/utils/parser.py\n@@ -86,7 +86,8 @@ def aggregate_scores(user_data: list) -> float:\n \n     def aggregate_scores(user_data: list) -> float:\n-        total = sum(item['score'] for item in user_data)\n-        return total / len(user_data)\n+        scores = [item.get('score') or 0 for item in user_data]\n+        if not scores:\n+            return 0.0\n+        return sum(scores) / len(scores)",

  IndexError:
    '--- a/src/models/order.py\n+++ b/src/models/order.py\n@@ -34,6 +34,10 @@ class OrderModel:\n \n     def get_latest_items(self, user_id: str) -> dict:\n         items = self.db.query(user_id=user_id, limit=10)\n-        return items[0]\n+        if not items:\n+            return {\n+                "items": [],\n+                "message": "No orders found for this user"\n+            }\n+        return items[0]',

  DatabaseConnectionError:
    '--- a/src/db/connection.py\n+++ b/src/db/connection.py\n@@ -56,12 +56,17 @@ class ConnectionPool:\n \n     def execute_report(self, query: str) -> list:\n-        conn = self.pool.acquire()\n-        cursor = conn.cursor()\n-        cursor.execute(query)\n-        return cursor.fetchall()\n+        conn = self.pool.acquire()\n+        try:\n+            cursor = conn.cursor()\n+            cursor.execute(query)\n+            return cursor.fetchall()\n+        except Exception as e:\n+            logger.error(f"Query failed: {e}")\n+            raise\n+        finally:\n+            self.pool.release(conn)',

  TimeoutError:
    '--- a/src/services/payment.py\n+++ b/src/services/payment.py\n@@ -28,8 +28,20 @@ class PaymentService:\n \n-    def charge(self, amount: float, token: str) -> dict:\n-        response = requests.post(\n-            GATEWAY_URL,\n-            json={"amount": amount, "token": token},\n-            timeout=30\n-        )\n-        return response.json()\n+    def charge(self, amount: float, token: str) -> dict:\n+        for attempt in range(3):\n+            try:\n+                response = requests.post(\n+                    GATEWAY_URL,\n+                    json={"amount": amount, "token": token},\n+                    timeout=10\n+                )\n+                return response.json()\n+            except requests.Timeout:\n+                wait = 2 ** attempt\n+                logger.warning(f"Gateway timeout, retry {attempt+1} in {wait}s")\n+                time.sleep(wait)\n+        raise PaymentGatewayError("Gateway unavailable after 3 attempts")',
};

const testCodes: Record<string, string> = {
  NullPointerException:
    '# test_user_handler.py\nimport pytest\nfrom unittest.mock import MagicMock\nfrom src.api.user_handler import UserHandler\n\nclass TestUserHandlerNullPayload:\n    def setup_method(self):\n        self.handler = UserHandler()\n\n    def test_null_payload_raises_401(self):\n        """Regression: null payload must return 401, not AttributeError"""\n        mock_request = MagicMock()\n        self.handler.auth_middleware = MagicMock()\n        self.handler.auth_middleware.get_payload.return_value = None\n        with pytest.raises(HTTPException) as exc_info:\n            self.handler.process_user_request(mock_request)\n        assert exc_info.value.status_code == 401\n\n    def test_valid_payload_succeeds(self):\n        """Happy path: valid payload processes correctly"""\n        mock_request = MagicMock()\n        mock_payload = MagicMock(user_id="user_123")\n        self.handler.auth_middleware.get_payload.return_value = mock_payload\n        self.handler.db.get_user = MagicMock(return_value={"id": "user_123"})\n        result = self.handler.process_user_request(mock_request)\n        assert result["id"] == "user_123"',

  KeyError:
    '# test_auth_service.py\nimport pytest\nfrom src.services.auth import AuthService\n\nclass TestAuthServiceEmailField:\n    def setup_method(self):\n        self.auth = AuthService()\n\n    def test_missing_email_raises_validation_error(self):\n        """Regression: missing email field must not raise KeyError"""\n        with pytest.raises(ValidationError) as exc_info:\n            self.auth.validate_credentials({})\n        assert "Email field is required" in str(exc_info.value)\n\n    def test_legacy_email_field_works(self):\n        """Legacy \'email\' field must still be accepted"""\n        result = self.auth.validate_credentials({\n            "email": "test@example.com",\n            "password": "secret"\n        })\n        assert result is not None\n\n    def test_new_email_address_field_works(self):\n        """New SDK \'emailAddress\' field must be accepted"""\n        result = self.auth.validate_credentials({\n            "emailAddress": "test@example.com",\n            "password": "secret"\n        })\n        assert result is not None',

  TypeError:
    '# test_parser.py\nimport pytest\nfrom src.utils.parser import aggregate_scores\n\nclass TestAggregateScores:\n    def test_none_scores_handled(self):\n        """Regression: None scores must not raise TypeError"""\n        data = [{"score": 85}, {"score": None}, {"score": 92}]\n        result = aggregate_scores(data)\n        assert result == pytest.approx(59.0)\n\n    def test_empty_list_returns_zero(self):\n        """Edge case: empty list returns 0.0, not ZeroDivisionError"""\n        assert aggregate_scores([]) == 0.0\n\n    def test_all_none_returns_zero(self):\n        """All None scores treated as 0"""\n        data = [{"score": None}, {"score": None}]\n        assert aggregate_scores(data) == 0.0',

  IndexError:
    '# test_order_model.py\nimport pytest\nfrom unittest.mock import MagicMock\nfrom src.models.order import OrderModel\n\nclass TestOrderModelGetLatest:\n    def setup_method(self):\n        self.model = OrderModel()\n        self.model.db = MagicMock()\n\n    def test_empty_order_history_returns_empty(self):\n        """Regression: new users with no orders must not raise IndexError"""\n        self.model.db.query.return_value = []\n        result = self.model.get_latest_items("new_user_123")\n        assert result["items"] == []\n        assert "message" in result\n\n    def test_user_with_orders_returns_latest(self):\n        """Users with orders return their most recent order"""\n        mock_order = {"id": "order_1", "items": [{"sku": "ABC"}]}\n        self.model.db.query.return_value = [mock_order]\n        result = self.model.get_latest_items("existing_user")\n        assert result["id"] == "order_1"',

  DatabaseConnectionError:
    '# test_connection_pool.py\nimport pytest\nfrom unittest.mock import MagicMock\nfrom src.db.connection import ConnectionPool\n\nclass TestConnectionPoolRelease:\n    def setup_method(self):\n        self.pool = ConnectionPool(max_size=5)\n\n    def test_connection_released_on_exception(self):\n        """Regression: connection must be released even when query fails"""\n        mock_conn = MagicMock()\n        self.pool.pool.acquire = MagicMock(return_value=mock_conn)\n        self.pool.pool.release = MagicMock()\n        mock_conn.cursor.return_value.execute.side_effect = Exception("Query failed")\n        with pytest.raises(Exception):\n            self.pool.execute_report("SELECT * FROM reports")\n        self.pool.pool.release.assert_called_once_with(mock_conn)\n\n    def test_connection_released_on_success(self):\n        """Connection must always be returned to the pool"""\n        mock_conn = MagicMock()\n        self.pool.pool.acquire = MagicMock(return_value=mock_conn)\n        self.pool.pool.release = MagicMock()\n        self.pool.execute_report("SELECT 1")\n        self.pool.pool.release.assert_called_once_with(mock_conn)',

  TimeoutError:
    '# test_payment_service.py\nimport pytest\nfrom unittest.mock import MagicMock, patch\nfrom requests import Timeout\nfrom src.services.payment import PaymentService, PaymentGatewayError\n\nclass TestPaymentServiceRetry:\n    def setup_method(self):\n        self.service = PaymentService()\n\n    @patch("src.services.payment.requests.post")\n    def test_retries_on_timeout(self, mock_post):\n        """Regression: timeout must trigger retry with backoff"""\n        mock_post.side_effect = [Timeout(), Timeout(), MagicMock(json=lambda: {"status": "ok"})]\n        result = self.service.charge(100.0, "tok_test")\n        assert result["status"] == "ok"\n        assert mock_post.call_count == 3\n\n    @patch("src.services.payment.requests.post")\n    def test_raises_after_max_retries(self, mock_post):\n        """3 consecutive timeouts must raise PaymentGatewayError"""\n        mock_post.side_effect = Timeout()\n        with pytest.raises(PaymentGatewayError):\n            self.service.charge(100.0, "tok_test")',
};

export function getRandomSimulationData() {
  const errorType = errorTypes[Math.floor(Math.random() * errorTypes.length)];
  const filePath = filePaths[Math.floor(Math.random() * filePaths.length)];
  const errorMessage =
    errorMessages[Math.floor(Math.random() * errorMessages.length)];
  const lineNumber = BigInt(Math.floor(Math.random() * 200) + 20);

  return { errorType, filePath, errorMessage, lineNumber };
}

export function getSimulationStageData(errorType: string) {
  const safeKey =
    errorType in rcaSummaries ? errorType : "NullPointerException";
  return {
    rcaSummary: rcaSummaries[safeKey] ?? "",
    patchCode: patchCodes[safeKey] ?? "",
    testCode: testCodes[safeKey] ?? "",
    prUrl: `https://github.com/krushna-joshi/app/pull/${Math.floor(Math.random() * 100) + 1}`,
    prTitle: `fix(${safeKey.toLowerCase()}): Add null safety and error handling`,
    prDescription: `## Summary\nThis PR addresses a critical ${errorType} in production.\n\n## Root Cause\n${rcaSummaries[safeKey]?.split("\n")[0] ?? ""}\n\n## Solution\n- Added null checks and guards\n- Implemented fallback behavior\n- Added regression tests\n\n## Tests\nAll existing tests pass. New regression test added.\n\n*Generated by Self-Healing DevOps Agent*`,
  };
}

export const PIPELINE_STAGES = [
  IncidentStatus.Detected,
  IncidentStatus.Analyzing,
  IncidentStatus.Patching,
  IncidentStatus.Sandboxing,
  IncidentStatus.PRSubmitted,
  IncidentStatus.Fixed,
];
