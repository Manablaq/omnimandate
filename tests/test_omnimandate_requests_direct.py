import hashlib
import sys


TEST_TIME_ISO = "2026-08-21T03:00:00Z"
TEST_TIME_UNIX = 1787281200

TITLE = "Autonomous operations treasury"
POLICY_V1 = (
    "The agent may pay for cloud infrastructure, security tooling, developer "
    "services, and approved APIs. Personal purchases are prohibited."
)
POLICY_V2 = (
    "The agent may pay for cloud infrastructure, security tooling, developer "
    "services, approved APIs, and independent software audits. Personal "
    "purchases are prohibited."
)

PURPOSE = "Pay the August production API invoice"
CATEGORY = "API_SERVICES"

PRIMARY_URL = "https:" + "//evidence.example/omni-primary.json"
CORROBORATION_URL = "https:" + "//evidence.example/omni-corroboration.json"
PRIMARY_SHA = "a" * 64
CORROBORATION_SHA = "b" * 64

INITIAL_FUNDING = 20_000
MAX_SINGLE = 7_000
PERIOD_BUDGET = 8_000
PERIOD_SECONDS = 3_600
EVIDENCE_AGE = 3_600
VALID_AMOUNT = 3_000
OBSERVED_AT = TEST_TIME_UNIX - 60


def _runtime_address(contract, raw):
    instance = object.__getattribute__(contract, "_instance")
    contract_module = sys.modules[type(instance).__module__]
    Address = contract_module.Address
    return Address(raw)


def _as_studio_integer(raw: bytes) -> int:
    return int.from_bytes(raw, "big")


def _setup(
    direct_vm,
    direct_deploy,
    owner,
    agent,
    funding=INITIAL_FUNDING,
):
    direct_vm.check_pickling = True
    direct_vm.warp(TEST_TIME_ISO)
    contract = direct_deploy("contracts/omnimandate.py")
    U = type(contract.next_vault_id)

    direct_vm.sender = owner
    direct_vm.value = funding
    vault_id = contract.create_vault(
        _runtime_address(contract, agent),
        TITLE,
        POLICY_V1,
        U(MAX_SINGLE),
        U(PERIOD_BUDGET),
        U(PERIOD_SECONDS),
        U(EVIDENCE_AGE),
    )
    direct_vm.value = 0
    return contract, vault_id, U


def _create_request(
    contract,
    direct_vm,
    U,
    vault_id,
    agent,
    owner,
    *,
    recipient=None,
    amount=VALID_AMOUNT,
    purpose=PURPOSE,
    category=CATEGORY,
    primary_url=PRIMARY_URL,
    primary_sha=PRIMARY_SHA,
    corroboration_url=CORROBORATION_URL,
    corroboration_sha=CORROBORATION_SHA,
    observed_at=OBSERVED_AT,
):
    if recipient is None:
        recipient = _runtime_address(contract, owner)

    with direct_vm.prank(agent):
        return contract.create_spend_request(
            vault_id,
            recipient,
            U(amount),
            purpose,
            category,
            primary_url,
            primary_sha,
            corroboration_url,
            corroboration_sha,
            U(observed_at),
        )


def test_current_agent_creates_request_and_reserves_exact_amount(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    contract, vault_id, U = _setup(
        direct_vm, direct_deploy, direct_alice, direct_bob
    )

    request_id = _create_request(
        contract,
        direct_vm,
        U,
        vault_id,
        direct_bob,
        direct_alice,
    )

    assert request_id == U(1)
    assert contract.get_request_count() == U(1)

    request = contract.get_spend_request(request_id)
    vault = contract.get_vault(vault_id)

    assert request.id == U(1)
    assert request.vault_id == vault_id
    assert request.requester.as_bytes == direct_bob
    assert request.recipient.as_bytes == direct_alice
    assert request.amount == U(VALID_AMOUNT)
    assert request.purpose == PURPOSE
    assert request.category == CATEGORY
    assert request.primary_evidence_url == PRIMARY_URL
    assert request.primary_evidence_sha256 == PRIMARY_SHA
    assert request.corroboration_url == CORROBORATION_URL
    assert request.corroboration_sha256 == CORROBORATION_SHA
    assert request.evidence_observed_at == U(OBSERVED_AT)
    assert request.mandate_version == U(1)
    assert request.mandate_hash == hashlib.sha256(POLICY_V1.encode()).hexdigest()
    assert request.state == "SUBMITTED"
    assert request.resolved_at == ""
    assert request.policy_status == ""
    assert request.evidence_status == ""
    assert request.reason == ""

    assert vault.reserved_balance == U(VALID_AMOUNT)
    assert vault.current_period_reserved == U(VALID_AMOUNT)
    assert vault.current_period_spent == U(0)
    assert vault.balance == U(INITIAL_FUNDING)


def test_unauthorized_requester_is_rejected(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    contract, vault_id, U = _setup(
        direct_vm, direct_deploy, direct_alice, direct_bob
    )

    with direct_vm.expect_revert(
        "only current authorized agent can create requests"
    ):
        contract.create_spend_request(
            vault_id,
            _runtime_address(contract, direct_alice),
            U(VALID_AMOUNT),
            PURPOSE,
            CATEGORY,
            PRIMARY_URL,
            PRIMARY_SHA,
            CORROBORATION_URL,
            CORROBORATION_SHA,
            U(OBSERVED_AT),
        )


def test_paused_vault_rejects_new_request(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    contract, vault_id, U = _setup(
        direct_vm, direct_deploy, direct_alice, direct_bob
    )
    contract.pause_vault(vault_id)

    with direct_vm.prank(direct_bob):
        with direct_vm.expect_revert("vault is paused"):
            contract.create_spend_request(
                vault_id,
                _runtime_address(contract, direct_alice),
                U(VALID_AMOUNT),
                PURPOSE,
                CATEGORY,
                PRIMARY_URL,
                PRIMARY_SHA,
                CORROBORATION_URL,
                CORROBORATION_SHA,
                U(OBSERVED_AT),
            )


def test_zero_recipient_is_rejected(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    contract, vault_id, U = _setup(
        direct_vm, direct_deploy, direct_alice, direct_bob
    )

    with direct_vm.prank(direct_bob):
        with direct_vm.expect_revert("recipient cannot be zero address"):
            contract.create_spend_request(
                vault_id,
                0,
                U(VALID_AMOUNT),
                PURPOSE,
                CATEGORY,
                PRIMARY_URL,
                PRIMARY_SHA,
                CORROBORATION_URL,
                CORROBORATION_SHA,
                U(OBSERVED_AT),
            )


def test_zero_amount_is_rejected(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    contract, vault_id, U = _setup(
        direct_vm, direct_deploy, direct_alice, direct_bob
    )

    with direct_vm.prank(direct_bob):
        with direct_vm.expect_revert("request amount must be positive"):
            contract.create_spend_request(
                vault_id,
                _runtime_address(contract, direct_alice),
                U(0),
                PURPOSE,
                CATEGORY,
                PRIMARY_URL,
                PRIMARY_SHA,
                CORROBORATION_URL,
                CORROBORATION_SHA,
                U(OBSERVED_AT),
            )


def test_single_spend_cap_is_enforced(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    contract, vault_id, U = _setup(
        direct_vm, direct_deploy, direct_alice, direct_bob
    )

    with direct_vm.prank(direct_bob):
        with direct_vm.expect_revert("request exceeds max_single_spend"):
            contract.create_spend_request(
                vault_id,
                _runtime_address(contract, direct_alice),
                U(MAX_SINGLE + 1),
                PURPOSE,
                CATEGORY,
                PRIMARY_URL,
                PRIMARY_SHA,
                CORROBORATION_URL,
                CORROBORATION_SHA,
                U(OBSERVED_AT),
            )


def test_empty_purpose_is_rejected(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    contract, vault_id, U = _setup(
        direct_vm, direct_deploy, direct_alice, direct_bob
    )
    with direct_vm.expect_revert("request purpose cannot be empty"):
        _create_request(
            contract,
            direct_vm,
            U,
            vault_id,
            direct_bob,
            direct_alice,
            purpose="   ",
        )


def test_oversized_purpose_is_rejected(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    contract, vault_id, U = _setup(
        direct_vm, direct_deploy, direct_alice, direct_bob
    )
    with direct_vm.expect_revert("request purpose is too long"):
        _create_request(
            contract,
            direct_vm,
            U,
            vault_id,
            direct_bob,
            direct_alice,
            purpose="p" * 1001,
        )


def test_empty_category_is_rejected(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    contract, vault_id, U = _setup(
        direct_vm, direct_deploy, direct_alice, direct_bob
    )
    with direct_vm.expect_revert("request category cannot be empty"):
        _create_request(
            contract,
            direct_vm,
            U,
            vault_id,
            direct_bob,
            direct_alice,
            category="   ",
        )


def test_oversized_category_is_rejected(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    contract, vault_id, U = _setup(
        direct_vm, direct_deploy, direct_alice, direct_bob
    )
    with direct_vm.expect_revert("request category is too long"):
        _create_request(
            contract,
            direct_vm,
            U,
            vault_id,
            direct_bob,
            direct_alice,
            category="c" * 129,
        )


def test_oversized_evidence_url_is_rejected(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    contract, vault_id, U = _setup(
        direct_vm, direct_deploy, direct_alice, direct_bob
    )
    oversized_url = "https://evidence.example/" + ("a" * 4096)

    with direct_vm.expect_revert("evidence URL is too long"):
        _create_request(
            contract,
            direct_vm,
            U,
            vault_id,
            direct_bob,
            direct_alice,
            primary_url=oversized_url,
        )


def test_non_https_primary_url_is_rejected(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    contract, vault_id, U = _setup(
        direct_vm, direct_deploy, direct_alice, direct_bob
    )

    with direct_vm.prank(direct_bob):
        with direct_vm.expect_revert("evidence URL must use https"):
            contract.create_spend_request(
                vault_id,
                _runtime_address(contract, direct_alice),
                U(VALID_AMOUNT),
                PURPOSE,
                CATEGORY,
                "http://evidence.example/primary",
                PRIMARY_SHA,
                CORROBORATION_URL,
                CORROBORATION_SHA,
                U(OBSERVED_AT),
            )


def test_non_https_corroboration_url_is_rejected(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    contract, vault_id, U = _setup(
        direct_vm, direct_deploy, direct_alice, direct_bob
    )

    with direct_vm.prank(direct_bob):
        with direct_vm.expect_revert("evidence URL must use https"):
            contract.create_spend_request(
                vault_id,
                _runtime_address(contract, direct_alice),
                U(VALID_AMOUNT),
                PURPOSE,
                CATEGORY,
                PRIMARY_URL,
                PRIMARY_SHA,
                "http://evidence.example/corroboration",
                CORROBORATION_SHA,
                U(OBSERVED_AT),
            )


def test_malformed_https_url_is_rejected(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    contract, vault_id, U = _setup(
        direct_vm, direct_deploy, direct_alice, direct_bob
    )

    with direct_vm.prank(direct_bob):
        with direct_vm.expect_revert("evidence URL is malformed"):
            contract.create_spend_request(
                vault_id,
                _runtime_address(contract, direct_alice),
                U(VALID_AMOUNT),
                PURPOSE,
                CATEGORY,
                "https://",
                PRIMARY_SHA,
                CORROBORATION_URL,
                CORROBORATION_SHA,
                U(OBSERVED_AT),
            )


def test_identical_evidence_urls_are_rejected(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    contract, vault_id, U = _setup(
        direct_vm, direct_deploy, direct_alice, direct_bob
    )

    with direct_vm.prank(direct_bob):
        with direct_vm.expect_revert("evidence URLs must differ"):
            contract.create_spend_request(
                vault_id,
                _runtime_address(contract, direct_alice),
                U(VALID_AMOUNT),
                PURPOSE,
                CATEGORY,
                PRIMARY_URL,
                PRIMARY_SHA,
                PRIMARY_URL,
                CORROBORATION_SHA,
                U(OBSERVED_AT),
            )


def test_malformed_primary_hash_length_is_rejected(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    contract, vault_id, U = _setup(
        direct_vm, direct_deploy, direct_alice, direct_bob
    )

    with direct_vm.prank(direct_bob):
        with direct_vm.expect_revert(
            "evidence SHA-256 must be 64 hex characters"
        ):
            contract.create_spend_request(
                vault_id,
                _runtime_address(contract, direct_alice),
                U(VALID_AMOUNT),
                PURPOSE,
                CATEGORY,
                PRIMARY_URL,
                "a" * 63,
                CORROBORATION_URL,
                CORROBORATION_SHA,
                U(OBSERVED_AT),
            )


def test_malformed_corroboration_hash_hex_is_rejected(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    contract, vault_id, U = _setup(
        direct_vm, direct_deploy, direct_alice, direct_bob
    )

    with direct_vm.prank(direct_bob):
        with direct_vm.expect_revert("evidence SHA-256 is not valid hex"):
            contract.create_spend_request(
                vault_id,
                _runtime_address(contract, direct_alice),
                U(VALID_AMOUNT),
                PURPOSE,
                CATEGORY,
                PRIMARY_URL,
                PRIMARY_SHA,
                CORROBORATION_URL,
                "g" * 64,
                U(OBSERVED_AT),
            )


def test_future_evidence_timestamp_is_rejected(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    contract, vault_id, U = _setup(
        direct_vm, direct_deploy, direct_alice, direct_bob
    )

    with direct_vm.prank(direct_bob):
        with direct_vm.expect_revert(
            "evidence timestamp cannot be in the future"
        ):
            contract.create_spend_request(
                vault_id,
                _runtime_address(contract, direct_alice),
                U(VALID_AMOUNT),
                PURPOSE,
                CATEGORY,
                PRIMARY_URL,
                PRIMARY_SHA,
                CORROBORATION_URL,
                CORROBORATION_SHA,
                U(TEST_TIME_UNIX + 1),
            )


def test_stale_evidence_at_submission_is_rejected(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    contract, vault_id, U = _setup(
        direct_vm, direct_deploy, direct_alice, direct_bob
    )

    with direct_vm.prank(direct_bob):
        with direct_vm.expect_revert("evidence is stale at submission"):
            contract.create_spend_request(
                vault_id,
                _runtime_address(contract, direct_alice),
                U(VALID_AMOUNT),
                PURPOSE,
                CATEGORY,
                PRIMARY_URL,
                PRIMARY_SHA,
                CORROBORATION_URL,
                CORROBORATION_SHA,
                U(TEST_TIME_UNIX - EVIDENCE_AGE - 1),
            )


def test_bradbury_integer_encoded_recipient_is_normalized(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    contract, vault_id, U = _setup(
        direct_vm, direct_deploy, direct_alice, direct_bob
    )

    request_id = _create_request(
        contract,
        direct_vm,
        U,
        vault_id,
        direct_bob,
        direct_alice,
        recipient=_as_studio_integer(direct_alice),
    )

    assert contract.get_spend_request(request_id).recipient == _runtime_address(
        contract, direct_alice
    )


def test_request_keeps_original_mandate_snapshot_after_update(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    contract, vault_id, U = _setup(
        direct_vm, direct_deploy, direct_alice, direct_bob
    )

    request_id = _create_request(
        contract,
        direct_vm,
        U,
        vault_id,
        direct_bob,
        direct_alice,
    )
    before = contract.get_spend_request(request_id)

    contract.create_mandate_version(
        vault_id,
        POLICY_V2,
        U(MAX_SINGLE),
        U(9_000),
        U(EVIDENCE_AGE),
    )

    after = contract.get_spend_request(request_id)
    assert before.mandate_version == U(1)
    assert after.mandate_version == U(1)
    assert after.mandate_hash == before.mandate_hash
    assert contract.get_active_mandate(vault_id).version == U(2)


def test_former_agent_cannot_create_after_revocation(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    contract, vault_id, U = _setup(
        direct_vm, direct_deploy, direct_alice, direct_bob
    )

    contract.set_agent(vault_id, _runtime_address(contract, direct_alice))

    with direct_vm.prank(direct_bob):
        with direct_vm.expect_revert(
            "only current authorized agent can create requests"
        ):
            contract.create_spend_request(
                vault_id,
                _runtime_address(contract, direct_alice),
                U(VALID_AMOUNT),
                PURPOSE,
                CATEGORY,
                PRIMARY_URL,
                PRIMARY_SHA,
                CORROBORATION_URL,
                CORROBORATION_SHA,
                U(OBSERVED_AT),
            )
