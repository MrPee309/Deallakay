"""DealLakay backend integration tests"""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") if "REACT_APP_BACKEND_URL" in os.environ else "https://haiti-deals.preview.emergentagent.com"
API = f"{BASE_URL}/api"

ADMIN_USER = "admin"
ADMIN_PASS = "Admin123!"
SELLER_USER = "petertech"
SELLER_PASS = "demo123"
BUYER_USER = "marieshop"  # We'll use marieshop as buyer-ish (also a seller but different user)
BUYER_PASS = "demo123"


def _login(u, p):
    r = requests.post(f"{API}/auth/login", json={"username": u, "password": p})
    assert r.status_code == 200, f"login failed for {u}: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def admin_token():
    return _login(ADMIN_USER, ADMIN_PASS)


@pytest.fixture(scope="session")
def seller_token():
    return _login(SELLER_USER, SELLER_PASS)


@pytest.fixture(scope="session")
def buyer_token():
    return _login(BUYER_USER, BUYER_PASS)


def H(t):
    return {"Authorization": f"Bearer {t}"}


# --------- Meta / Config ---------
class TestMeta:
    def test_config(self):
        r = requests.get(f"{API}/config")
        assert r.status_code == 200
        data = r.json()
        assert "site_branding" in data
        assert data["site_branding"].get("siteName") == "DealLakay"

    def test_categories(self):
        r = requests.get(f"{API}/categories")
        assert r.status_code == 200
        cats = r.json()
        assert len(cats) >= 5
        assert all("subcategories" in c for c in cats)

    def test_locations(self):
        r = requests.get(f"{API}/locations")
        assert r.status_code == 200
        assert len(r.json()) == 10


# --------- Auth ---------
class TestAuth:
    def test_admin_login(self):
        r = requests.post(f"{API}/auth/login", json={"username": ADMIN_USER, "password": ADMIN_PASS})
        assert r.status_code == 200
        d = r.json()
        assert "access_token" in d
        assert d["user"]["role"] == "admin"

    def test_login_invalid(self):
        r = requests.post(f"{API}/auth/login", json={"username": "admin", "password": "wrong"})
        assert r.status_code == 401

    def test_me_requires_auth(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_me_with_token(self, admin_token):
        r = requests.get(f"{API}/auth/me", headers=H(admin_token))
        assert r.status_code == 200
        assert r.json()["username"] == "admin"

    def test_register_flow_and_verify(self):
        suffix = uuid.uuid4().hex[:8]
        payload = {
            "full_name": "Test User",
            "username": f"testu_{suffix}",
            "email": f"test_{suffix}@example.com",
            "phone": "+50930000000",
            "password": "pass123",
            "confirm_password": "pass123",
            "country": "Ayiti",
            "department": "Ouest",
            "city": "Port-au-Prince",
            "accept_terms": True,
        }
        r = requests.post(f"{API}/auth/register", json=payload)
        assert r.status_code == 200, r.text
        link = r.json().get("demo_verification_link")
        assert link and "token=" in link
        # Login before verify -> 403
        r2 = requests.post(f"{API}/auth/login", json={"username": payload["username"], "password": "pass123"})
        assert r2.status_code == 403
        # Verify
        token = link.split("token=")[1]
        r3 = requests.get(f"{API}/auth/verify-email", params={"token": token})
        assert r3.status_code == 200
        # Login after verify
        r4 = requests.post(f"{API}/auth/login", json={"username": payload["username"], "password": "pass123"})
        assert r4.status_code == 200

    def test_register_password_mismatch(self):
        suffix = uuid.uuid4().hex[:6]
        payload = {
            "full_name": "X", "username": f"u_{suffix}", "email": f"x_{suffix}@e.com",
            "phone": "+509", "password": "aaaaaa", "confirm_password": "bbbbbb",
            "country": "Ayiti", "department": "Ouest", "city": "PAP", "accept_terms": True,
        }
        r = requests.post(f"{API}/auth/register", json=payload)
        assert r.status_code == 400

    def test_register_duplicate_username(self):
        payload = {
            "full_name": "X", "username": "admin", "email": f"newadmin_{uuid.uuid4().hex[:6]}@e.com",
            "phone": "+509", "password": "aaaaaa", "confirm_password": "aaaaaa",
            "country": "Ayiti", "department": "Ouest", "city": "PAP", "accept_terms": True,
        }
        r = requests.post(f"{API}/auth/register", json=payload)
        assert r.status_code == 400

    def test_register_no_terms(self):
        suffix = uuid.uuid4().hex[:6]
        payload = {
            "full_name": "X", "username": f"nt_{suffix}", "email": f"nt_{suffix}@e.com",
            "phone": "+509", "password": "aaaaaa", "confirm_password": "aaaaaa",
            "country": "Ayiti", "department": "Ouest", "city": "PAP", "accept_terms": False,
        }
        r = requests.post(f"{API}/auth/register", json=payload)
        assert r.status_code == 400


# --------- Seller & Products ---------
class TestSellerProducts:
    def test_seller_dashboard(self, seller_token):
        r = requests.get(f"{API}/seller/dashboard", headers=H(seller_token))
        assert r.status_code == 200
        d = r.json()
        assert "stats" in d and "profile" in d

    def test_dashboard_non_seller_forbidden(self):
        # Create fresh user (not seller)
        suffix = uuid.uuid4().hex[:8]
        payload = {
            "full_name": "NS", "username": f"ns_{suffix}", "email": f"ns_{suffix}@e.com",
            "phone": "+509", "password": "aaaaaa", "confirm_password": "aaaaaa",
            "country": "Ayiti", "department": "Ouest", "city": "PAP", "accept_terms": True,
        }
        r = requests.post(f"{API}/auth/register", json=payload)
        link = r.json()["demo_verification_link"]
        tok = link.split("token=")[1]
        requests.get(f"{API}/auth/verify-email", params={"token": tok})
        lr = requests.post(f"{API}/auth/login", json={"username": payload["username"], "password": "aaaaaa"})
        t = lr.json()["access_token"]
        pytest.non_seller_token = t
        r2 = requests.get(f"{API}/seller/dashboard", headers=H(t))
        assert r2.status_code == 403
        # Become seller
        r3 = requests.post(f"{API}/seller/become", headers=H(t),
                           json={"accept_seller_terms": True, "accept_marketplace_rules": True})
        assert r3.status_code == 200
        r4 = requests.get(f"{API}/seller/dashboard", headers=H(t))
        assert r4.status_code == 200

    def test_create_and_get_product_imei_private(self, seller_token):
        payload = {
            "category": "phones", "subcategory": "iPhone",
            "title": "TEST_Product_iPhone", "description": "test",
            "price": 25000, "quantity": 1, "condition": "Used",
            "department": "Ouest", "city": "Port-au-Prince",
            "specs": {"brand": "Apple", "model": "13"},
            "images": [], "imei": "356789101112131",
        }
        r = requests.post(f"{API}/products", headers=H(seller_token), json=payload)
        assert r.status_code == 200, r.text
        prod = r.json()
        pid = prod["id"]
        pytest.test_pid = pid
        # imei present to owner in create response
        assert prod.get("imei") == "356789101112131"

        # public list should NOT show imei
        r2 = requests.get(f"{API}/products", params={"q": "TEST_Product_iPhone"})
        assert r2.status_code == 200
        items = r2.json()["products"]
        found = [p for p in items if p["id"] == pid]
        assert len(found) == 1
        assert "imei" not in found[0]

        # detail as anon -> no imei, views increments
        r3 = requests.get(f"{API}/products/{pid}")
        assert r3.status_code == 200
        d = r3.json()
        assert "imei" not in d["product"]
        assert d["seller"] is not None
        assert d["product"]["views"] >= 1

    def test_product_filters_sort(self, seller_token):
        r = requests.get(f"{API}/products", params={"category": "phones", "sort": "price_low", "page": 1, "limit": 5})
        assert r.status_code == 200
        data = r.json()
        prices = [p["price"] for p in data["products"]]
        assert prices == sorted(prices)
        r2 = requests.get(f"{API}/products", params={"min_price": 1000, "max_price": 999999999})
        assert r2.status_code == 200

    def test_edit_mark_sold_restore_delete(self, seller_token, buyer_token):
        pid = pytest.test_pid
        # non-owner cannot edit
        r = requests.put(f"{API}/products/{pid}", headers=H(buyer_token), json={
            "category": "phones", "title": "hack", "price": 1, "department": "Ouest", "city": "PAP",
        })
        assert r.status_code == 403
        # owner can edit
        r2 = requests.put(f"{API}/products/{pid}", headers=H(seller_token), json={
            "category": "phones", "subcategory": "iPhone", "title": "TEST_Product_iPhone_v2",
            "description": "u", "price": 30000, "department": "Ouest", "city": "PAP",
            "imei": "356789101112131",
        })
        assert r2.status_code == 200
        assert r2.json()["title"] == "TEST_Product_iPhone_v2"
        # mark sold
        r3 = requests.post(f"{API}/products/{pid}/mark-sold", headers=H(seller_token))
        assert r3.status_code == 200
        # restore
        r4 = requests.post(f"{API}/products/{pid}/restore", headers=H(seller_token))
        assert r4.status_code == 200
        # delete
        r5 = requests.delete(f"{API}/products/{pid}", headers=H(seller_token))
        assert r5.status_code == 200
        r6 = requests.get(f"{API}/products/{pid}")
        assert r6.status_code == 404


# --------- Favorites / Messaging / Reviews ---------
class TestInteractions:
    @pytest.fixture(scope="class")
    def seller_pid(self, seller_token):
        payload = {
            "category": "phones", "subcategory": "iPhone",
            "title": "TEST_Interact_Prod", "description": "x",
            "price": 15000, "quantity": 1, "condition": "New",
            "department": "Ouest", "city": "PAP", "specs": {},
            "images": [], "imei": "",
        }
        r = requests.post(f"{API}/products", headers=H(seller_token), json=payload)
        assert r.status_code == 200
        return r.json()["id"]

    def test_favorites_toggle(self, buyer_token, seller_pid):
        r = requests.post(f"{API}/favorites/{seller_pid}", headers=H(buyer_token))
        assert r.status_code == 200
        assert r.json()["favorited"] in (True, False)
        r2 = requests.get(f"{API}/favorites", headers=H(buyer_token))
        assert r2.status_code == 200

    def test_conversation_and_message(self, buyer_token, seller_token, seller_pid):
        r = requests.post(f"{API}/conversations", headers=H(buyer_token), json={"product_id": seller_pid})
        assert r.status_code == 200, r.text
        cid = r.json()["id"]
        # self message forbidden
        r_self = requests.post(f"{API}/conversations", headers=H(seller_token), json={"product_id": seller_pid})
        assert r_self.status_code == 400
        # send message
        r2 = requests.post(f"{API}/conversations/{cid}/messages", headers=H(buyer_token),
                           json={"content": "Bonjou"})
        assert r2.status_code == 200
        r3 = requests.get(f"{API}/conversations", headers=H(seller_token))
        assert r3.status_code == 200
        r4 = requests.get(f"{API}/conversations/{cid}/messages", headers=H(seller_token))
        assert r4.status_code == 200
        assert len(r4.json()["messages"]) >= 1

    def test_review_flow(self, buyer_token, seller_token):
        # seller_id = petertech's user id
        me_r = requests.get(f"{API}/auth/me", headers=H(seller_token))
        seller_id = me_r.json()["id"]
        # buyer reviews seller
        r = requests.post(f"{API}/reviews", headers=H(buyer_token),
                          json={"seller_id": seller_id, "rating": 5, "comment": "TEST review"})
        # may fail if already reviewed from previous run - accept 200 or 400
        assert r.status_code in (200, 400), r.text
        # self review forbidden
        r2 = requests.post(f"{API}/reviews", headers=H(seller_token),
                           json={"seller_id": seller_id, "rating": 5, "comment": "self"})
        assert r2.status_code == 400
        # get reviews
        r3 = requests.get(f"{API}/sellers/petertech/reviews")
        assert r3.status_code == 200

    def test_report(self, buyer_token, seller_pid):
        r = requests.post(f"{API}/reports", headers=H(buyer_token),
                          json={"target_type": "product", "target_id": seller_pid, "reason": "spam"})
        assert r.status_code == 200

    def test_notifications(self, seller_token):
        r = requests.get(f"{API}/notifications", headers=H(seller_token))
        assert r.status_code == 200
        assert "notifications" in r.json()
        r2 = requests.post(f"{API}/notifications/read-all", headers=H(seller_token))
        assert r2.status_code == 200


# --------- Public seller ---------
class TestPublicSeller:
    def test_public_seller(self):
        r = requests.get(f"{API}/sellers/petertech")
        assert r.status_code == 200
        d = r.json()
        assert d["user"]["username"] == "petertech"
        # imei stripped
        for p in d["products"]:
            assert "imei" not in p


# --------- Admin ---------
class TestAdmin:
    def test_admin_stats(self, admin_token):
        r = requests.get(f"{API}/admin/stats", headers=H(admin_token))
        assert r.status_code == 200
        assert "total_users" in r.json()

    def test_admin_users(self, admin_token):
        r = requests.get(f"{API}/admin/users", headers=H(admin_token))
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_admin_products_and_imei(self, admin_token, seller_token):
        # create a product with imei
        p = requests.post(f"{API}/products", headers=H(seller_token), json={
            "category": "phones", "title": "TEST_IMEI_Prod", "price": 100,
            "department": "Ouest", "city": "PAP", "imei": "999888777666555",
        })
        pid = p.json()["id"]
        r = requests.get(f"{API}/admin/products", headers=H(admin_token))
        assert r.status_code == 200
        r2 = requests.get(f"{API}/admin/products/{pid}/imei", headers=H(admin_token))
        assert r2.status_code == 200
        assert r2.json()["imei"] == "999888777666555"

    def test_admin_settings_get_put(self, admin_token):
        r = requests.get(f"{API}/admin/settings", headers=H(admin_token))
        assert r.status_code == 200
        original = r.json()
        r2 = requests.put(f"{API}/admin/settings", headers=H(admin_token),
                          json={"listing_mode": original.get("listing_mode", "auto")})
        assert r2.status_code == 200

    def test_admin_category_crud(self, admin_token):
        r = requests.post(f"{API}/admin/categories", headers=H(admin_token),
                          json={"name_ht": "TEST_Cat", "name_en": "TEST_Cat", "icon": "tag", "type": "accessories"})
        assert r.status_code == 200
        cid = r.json()["id"]
        r2 = requests.post(f"{API}/admin/categories/{cid}/subcategories", headers=H(admin_token),
                           json={"name": "TEST_Sub"})
        assert r2.status_code == 200
        r3 = requests.delete(f"{API}/admin/categories/{cid}", headers=H(admin_token))
        assert r3.status_code == 200

    def test_admin_verifications(self, admin_token):
        r = requests.get(f"{API}/admin/verifications", headers=H(admin_token))
        assert r.status_code == 200

    def test_non_admin_forbidden(self, seller_token):
        r = requests.get(f"{API}/admin/stats", headers=H(seller_token))
        assert r.status_code == 403
        r2 = requests.get(f"{API}/admin/users", headers=H(seller_token))
        assert r2.status_code == 403


# --------- Authorization ---------
class TestAuthorization:
    def test_unauth_protected(self):
        for path in ["/auth/me", "/seller/dashboard", "/favorites", "/conversations", "/notifications", "/admin/stats"]:
            r = requests.get(f"{API}{path}")
            assert r.status_code == 401, f"{path} -> {r.status_code}"
