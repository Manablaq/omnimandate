# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *
from dataclasses import dataclass
from datetime import datetime, timezone
import hashlib
import typing


VAULT_ACTIVE = "ACTIVE"
VAULT_PAUSED = "PAUSED"

REQUEST_SUBMITTED = "SUBMITTED"
REQUEST_APPROVED = "APPROVED"
REQUEST_DENIED = "DENIED"
REQUEST_CANCELLED = "CANCELLED"


@allow_storage
@dataclass
class Vault:
    owner: Address
    authorized_agent: Address
    title: str
    balance: u256
    reserved_balance: u256
    lifetime_spent: u256
    current_period_spent: u256
    current_period_reserved: u256
    period_started_at: u256
    period_seconds: u256
    active_mandate_id: u256
    active_mandate_version: u256
    status: str
    created_at: str


@allow_storage
@dataclass
class Mandate:
    vault_id: u256
    version: u256
    previous_mandate_id: u256
    policy_text: str
    policy_sha256: str
    max_single_spend: u256
    period_budget: u256
    max_evidence_age_seconds: u256
    created_at: str


@allow_storage
@dataclass
class SpendRequest:
    id: u256
    vault_id: u256
    requester: Address
    recipient: Address
    amount: u256
    purpose: str
    category: str
    primary_evidence_url: str
    primary_evidence_sha256: str
    corroboration_url: str
    corroboration_sha256: str
    evidence_observed_at: u256
    mandate_version: u256
    mandate_hash: str
    created_at: str
    resolved_at: str
    state: str
    policy_status: str
    evidence_status: str
    reason: str


class OmniMandate(gl.Contract):
    """
    Policy-bound treasury control for autonomous agents.

    Deterministic vault, mandate-version, spend-request, evidence-binding,
    reservation, period, and funding primitives.

    Validator adjudication, claimable accounting, owner recovery, and external
    withdrawal are intentionally added in later verified slices.
    """

    vaults: TreeMap[u256, Vault]
    mandates: TreeMap[u256, Mandate]
    spend_requests: TreeMap[u256, SpendRequest]
    next_vault_id: u256
    next_mandate_id: u256
    next_request_id: u256

    def __init__(self):
        self.next_vault_id = u256(1)
        self.next_mandate_id = u256(1)
        self.next_request_id = u256(1)

    @gl.public.write.payable
    def create_vault(
        self,
        authorized_agent: Address,
        title: str,
        policy_text: str,
        max_single_spend: u256,
        period_budget: u256,
        period_seconds: u256,
        max_evidence_age_seconds: u256,
    ) -> u256:
        self._validate_title(title)
        self._validate_policy(
            policy_text,
            max_single_spend,
            period_budget,
            max_evidence_age_seconds,
        )
        if period_seconds == u256(0):
            raise gl.vm.UserError("period_seconds must be positive")

        now = self._now_ts()
        now_iso = datetime.now(timezone.utc).isoformat()

        vault_id = self.next_vault_id
        mandate_id = self.next_mandate_id
        policy_sha256 = self._sha256_text(policy_text)

        self.mandates[mandate_id] = Mandate(
            vault_id=vault_id,
            version=u256(1),
            previous_mandate_id=u256(0),
            policy_text=policy_text,
            policy_sha256=policy_sha256,
            max_single_spend=max_single_spend,
            period_budget=period_budget,
            max_evidence_age_seconds=max_evidence_age_seconds,
            created_at=now_iso,
        )

        self.vaults[vault_id] = Vault(
            owner=gl.message.sender_address,
            authorized_agent=self._normalize_address(authorized_agent),
            title=title,
            balance=gl.message.value,
            reserved_balance=u256(0),
            lifetime_spent=u256(0),
            current_period_spent=u256(0),
            current_period_reserved=u256(0),
            period_started_at=now,
            period_seconds=period_seconds,
            active_mandate_id=mandate_id,
            active_mandate_version=u256(1),
            status=VAULT_ACTIVE,
            created_at=now_iso,
        )

        self.next_vault_id = vault_id + u256(1)
        self.next_mandate_id = mandate_id + u256(1)
        return vault_id

    @gl.public.write.payable
    def fund_vault(self, vault_id: u256) -> None:
        vault = self._require_vault(vault_id)
        self._require_owner(vault)
        if gl.message.value == u256(0):
            raise gl.vm.UserError("funding value must be positive")

        vault.balance = vault.balance + gl.message.value

    @gl.public.write
    def set_agent(self, vault_id: u256, new_agent: Address) -> None:
        vault = self._require_vault(vault_id)
        self._require_owner(vault)
        vault.authorized_agent = self._normalize_address(new_agent)

    @gl.public.write
    def pause_vault(self, vault_id: u256) -> None:
        vault = self._require_vault(vault_id)
        self._require_owner(vault)
        if vault.status == VAULT_PAUSED:
            raise gl.vm.UserError("vault is already paused")
        vault.status = VAULT_PAUSED

    @gl.public.write
    def resume_vault(self, vault_id: u256) -> None:
        vault = self._require_vault(vault_id)
        self._require_owner(vault)
        if vault.status == VAULT_ACTIVE:
            raise gl.vm.UserError("vault is already active")
        vault.status = VAULT_ACTIVE

    @gl.public.write
    def create_mandate_version(
        self,
        vault_id: u256,
        policy_text: str,
        max_single_spend: u256,
        period_budget: u256,
        max_evidence_age_seconds: u256,
    ) -> u256:
        vault = self._require_vault(vault_id)
        self._require_owner(vault)
        self._sync_period(vault)
        self._validate_policy(
            policy_text,
            max_single_spend,
            period_budget,
            max_evidence_age_seconds,
        )

        current_pressure = (
            vault.current_period_spent + vault.current_period_reserved
        )
        if period_budget < current_pressure:
            raise gl.vm.UserError(
                "new period budget cannot be below current spent plus reserved"
            )

        mandate_id = self.next_mandate_id
        version = vault.active_mandate_version + u256(1)

        self.mandates[mandate_id] = Mandate(
            vault_id=vault_id,
            version=version,
            previous_mandate_id=vault.active_mandate_id,
            policy_text=policy_text,
            policy_sha256=self._sha256_text(policy_text),
            max_single_spend=max_single_spend,
            period_budget=period_budget,
            max_evidence_age_seconds=max_evidence_age_seconds,
            created_at=datetime.now(timezone.utc).isoformat(),
        )

        vault.active_mandate_id = mandate_id
        vault.active_mandate_version = version
        self.next_mandate_id = mandate_id + u256(1)
        return mandate_id

    @gl.public.write
    def create_spend_request(
        self,
        vault_id: u256,
        recipient: Address,
        amount: u256,
        purpose: str,
        category: str,
        primary_evidence_url: str,
        primary_evidence_sha256: str,
        corroboration_url: str,
        corroboration_sha256: str,
        evidence_observed_at: u256,
    ) -> u256:
        vault = self._require_vault(vault_id)
        if vault.status != VAULT_ACTIVE:
            raise gl.vm.UserError("vault is paused")
        if gl.message.sender_address != vault.authorized_agent:
            raise gl.vm.UserError(
                "only current authorized agent can create requests"
            )

        self._sync_period(vault)
        mandate = self._require_mandate(vault.active_mandate_id)
        recipient_address = self._normalize_address(recipient)

        if recipient_address == Address(
            "0x0000000000000000000000000000000000000000"
        ):
            raise gl.vm.UserError("recipient cannot be zero address")
        if amount == u256(0):
            raise gl.vm.UserError("request amount must be positive")
        if amount > mandate.max_single_spend:
            raise gl.vm.UserError("request exceeds max_single_spend")

        self._validate_evidence_ref(
            primary_evidence_url,
            primary_evidence_sha256,
        )
        self._validate_evidence_ref(
            corroboration_url,
            corroboration_sha256,
        )
        if primary_evidence_url == corroboration_url:
            raise gl.vm.UserError("evidence URLs must differ")

        now = self._now_ts()
        if evidence_observed_at > now:
            raise gl.vm.UserError(
                "evidence timestamp cannot be in the future"
            )
        evidence_age = now - evidence_observed_at
        if evidence_age > mandate.max_evidence_age_seconds:
            raise gl.vm.UserError("evidence is stale at submission")

        if vault.reserved_balance > vault.balance:
            raise gl.vm.UserError("vault reservation invariant violated")
        available_balance = vault.balance - vault.reserved_balance
        if amount > available_balance:
            raise gl.vm.UserError("insufficient unreserved vault balance")

        current_pressure = (
            vault.current_period_spent + vault.current_period_reserved
        )
        if current_pressure > mandate.period_budget:
            raise gl.vm.UserError("period budget invariant violated")
        available_period_budget = mandate.period_budget - current_pressure
        if amount > available_period_budget:
            raise gl.vm.UserError("request exceeds available period budget")

        request_id = self.next_request_id
        self.spend_requests[request_id] = SpendRequest(
            id=request_id,
            vault_id=vault_id,
            requester=gl.message.sender_address,
            recipient=recipient_address,
            amount=amount,
            purpose=purpose,
            category=category,
            primary_evidence_url=primary_evidence_url,
            primary_evidence_sha256=primary_evidence_sha256.lower(),
            corroboration_url=corroboration_url,
            corroboration_sha256=corroboration_sha256.lower(),
            evidence_observed_at=evidence_observed_at,
            mandate_version=mandate.version,
            mandate_hash=mandate.policy_sha256,
            created_at=datetime.now(timezone.utc).isoformat(),
            resolved_at="",
            state=REQUEST_SUBMITTED,
            policy_status="",
            evidence_status="",
            reason="",
        )

        vault.reserved_balance = vault.reserved_balance + amount
        vault.current_period_reserved = (
            vault.current_period_reserved + amount
        )
        self.next_request_id = request_id + u256(1)
        return request_id

    @gl.public.write
    def cancel_spend_request(self, request_id: u256) -> None:
        request = self._require_spend_request(request_id)
        if request.state != REQUEST_SUBMITTED:
            raise gl.vm.UserError(
                "only submitted requests can be cancelled"
            )

        vault = self._require_vault(request.vault_id)
        caller = gl.message.sender_address
        if caller != vault.owner and caller != request.requester:
            raise gl.vm.UserError(
                "only vault owner or request creator can cancel"
            )

        self._sync_period(vault)
        self._release_reservation(vault, request.amount)

        request.state = REQUEST_CANCELLED
        request.resolved_at = datetime.now(timezone.utc).isoformat()

    @gl.public.view
    def get_vault(self, vault_id: u256) -> Vault:
        return self._require_vault(vault_id)

    @gl.public.view
    def get_vault_count(self) -> u256:
        return self.next_vault_id - u256(1)

    @gl.public.view
    def get_mandate(self, vault_id: u256, version: u256) -> Mandate:
        vault = self._require_vault(vault_id)
        if version == u256(0) or version > vault.active_mandate_version:
            raise gl.vm.UserError("mandate version does not exist")

        mandate_id = vault.active_mandate_id
        while mandate_id != u256(0):
            mandate = self._require_mandate(mandate_id)
            if mandate.version == version:
                return mandate
            mandate_id = mandate.previous_mandate_id

        raise gl.vm.UserError("mandate version does not exist")

    @gl.public.view
    def get_mandate_by_id(self, mandate_id: u256) -> Mandate:
        return self._require_mandate(mandate_id)

    @gl.public.view
    def get_active_mandate(self, vault_id: u256) -> Mandate:
        vault = self._require_vault(vault_id)
        return self._require_mandate(vault.active_mandate_id)

    @gl.public.view
    def get_mandate_count(self) -> u256:
        return self.next_mandate_id - u256(1)

    @gl.public.view
    def get_spend_request(self, request_id: u256) -> SpendRequest:
        return self._require_spend_request(request_id)

    @gl.public.view
    def get_request_count(self) -> u256:
        return self.next_request_id - u256(1)

    def _require_vault(self, vault_id: u256) -> Vault:
        if vault_id == u256(0) or vault_id >= self.next_vault_id:
            raise gl.vm.UserError("vault does not exist")
        return self.vaults[vault_id]

    def _require_mandate(self, mandate_id: u256) -> Mandate:
        if mandate_id == u256(0) or mandate_id >= self.next_mandate_id:
            raise gl.vm.UserError("mandate does not exist")
        return self.mandates[mandate_id]

    def _require_spend_request(self, request_id: u256) -> SpendRequest:
        if request_id == u256(0) or request_id >= self.next_request_id:
            raise gl.vm.UserError("spend request does not exist")
        return self.spend_requests[request_id]

    def _require_owner(self, vault: Vault) -> None:
        if gl.message.sender_address != vault.owner:
            raise gl.vm.UserError("only vault owner can perform this action")

    def _normalize_address(self, value: typing.Any) -> Address:
        if isinstance(value, Address):
            return value
        if isinstance(value, int):
            if value < 0 or value >= (1 << 160):
                raise gl.vm.UserError("invalid address integer")
            return Address(value.to_bytes(20, "big"))
        if isinstance(value, str):
            return Address(value)
        if isinstance(value, bytes):
            return Address(value)
        raise gl.vm.UserError("invalid address representation")

    def _validate_title(self, title: str) -> None:
        if len(title.strip()) == 0:
            raise gl.vm.UserError("vault title cannot be empty")
        if len(title) > 120:
            raise gl.vm.UserError("vault title is too long")

    def _validate_policy(
        self,
        policy_text: str,
        max_single_spend: u256,
        period_budget: u256,
        max_evidence_age_seconds: u256,
    ) -> None:
        if len(policy_text.strip()) == 0:
            raise gl.vm.UserError("policy text cannot be empty")
        if len(policy_text) > 20_000:
            raise gl.vm.UserError("policy text is too long")
        if max_single_spend == u256(0):
            raise gl.vm.UserError("max_single_spend must be positive")
        if period_budget == u256(0):
            raise gl.vm.UserError("period_budget must be positive")
        if max_single_spend > period_budget:
            raise gl.vm.UserError(
                "max_single_spend cannot exceed period_budget"
            )
        if max_evidence_age_seconds == u256(0):
            raise gl.vm.UserError(
                "max_evidence_age_seconds must be positive"
            )

    def _validate_evidence_ref(self, url: str, digest: str) -> None:
        if not url.startswith("https://"):
            raise gl.vm.UserError("evidence URL must use https")

        authority_and_path = url[len("https://"):]
        if (
            len(authority_and_path) == 0
            or authority_and_path.startswith("/")
            or " " in url
            or "\n" in url
            or "\t" in url
        ):
            raise gl.vm.UserError("evidence URL is malformed")

        normalized = digest.lower()
        if len(normalized) != 64:
            raise gl.vm.UserError(
                "evidence SHA-256 must be 64 hex characters"
            )
        for c in normalized:
            if c not in "0123456789abcdef":
                raise gl.vm.UserError(
                    "evidence SHA-256 is not valid hex"
                )

    def _release_reservation(self, vault: Vault, amount: u256) -> None:
        if vault.reserved_balance < amount:
            raise gl.vm.UserError("vault reservation invariant violated")
        if vault.current_period_reserved < amount:
            raise gl.vm.UserError("period reservation invariant violated")

        vault.reserved_balance = vault.reserved_balance - amount
        vault.current_period_reserved = (
            vault.current_period_reserved - amount
        )

    def _sha256_text(self, value: str) -> str:
        return hashlib.sha256(value.encode("utf-8")).hexdigest()

    def _now_ts(self) -> u256:
        return u256(int(datetime.now(timezone.utc).timestamp()))

    def _sync_period(self, vault: Vault) -> None:
        now = self._now_ts()
        boundary = vault.period_started_at + vault.period_seconds
        if now < boundary:
            return

        elapsed = now - vault.period_started_at
        periods = elapsed // vault.period_seconds
        vault.period_started_at = (
            vault.period_started_at + periods * vault.period_seconds
        )
        vault.current_period_spent = u256(0)
        # current_period_reserved intentionally carries across period rollover.
