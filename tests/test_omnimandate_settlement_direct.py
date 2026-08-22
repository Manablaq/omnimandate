import hashlib
import json
import sys


TEST_TIME_ISO = "2026-08-21T03:00:00Z"
TEST_TIME_UNIX = 1787281200
ROLLOVER_ISO = "2026-08-21T04:00:00Z"

TITLE = "Autonomous treasury settlement"
POLICY_V1 = "TOKEN_POLICY_V1: production cloud and approved API invoices are permitted."
POLICY_V2 = "TOKEN_POLICY_V2: only security audits are permitted."
PURPOSE = "Pay production API invoice"
CATEGORY = "API_SERVICES"

FUNDING = 20_000
AMOUNT = 3_000
MAX_SINGLE = 7_000
PERIOD_BUDGET = 10_000
PERIOD_SECONDS = 3_600
EVIDENCE_AGE = 7_200

PRIMARY_URL = "https:" + "//evidence.example/settle-primary.txt"
CORROBORATION_URL = "https:" + "//evidence.example/settle-corroboration.txt"
PRIMARY_BODY = "Settlement evidence: API invoice, amount 3000, recipient confirmed."
CORROBORATION_BODY = "Operations log confirms API invoice, amount 3000, recipient confirmed."
PRIMARY_SHA = hashlib.sha256(PRIMARY_BODY.encode()).hexdigest()
CORROBORATION_SHA = hashlib.sha256(CORROBORATION_BODY.encode()).hexdigest()


def _runtime_address(contract, raw):
    instance = object.__getattribute__(contract, "_instance")
    contract_module = sys.modules[type(instance).__module__]
    Address = contract_module.Address
    return Address(raw)


def _setup(
    direct_vm,
    direct_deploy,
    owner,
    agent,
    evidence_age=EVIDENCE_AGE,
):
    direct_vm.check_pickling = True
    direct_vm.warp(TEST_TIME_ISO)
    contract = direct_deploy("contracts/omnimandate.py")
    U = type(contract.next_vault_id)

    direct_vm.sender = owner
    direct_vm.value = FUNDING
    vault_id = contract.create_vault(
        _runtime_address(contract, agent),
        TITLE,
        POLICY_V1,
        U(MAX_SINGLE),
        U(PERIOD_BUDGET),
        U(PERIOD_SECONDS),
        U(evidence_age),
    )
    direct_vm.value = 0

    with direct_vm.prank(agent):
        request_id = contract.create_spend_request(
            vault_id,
            _runtime_address(contract, owner),
            U(AMOUNT),
            PURPOSE,
            CATEGORY,
            PRIMARY_URL,
            PRIMARY_SHA,
            CORROBORATION_URL,
            CORROBORATION_SHA,
            U(TEST_TIME_UNIX - 60),
        )

    return contract, vault_id, request_id, U


def _mock_evidence(direct_vm):
    direct_vm.mock_web(
        r"evidence\.example/settle-primary\.txt",
        {"status": 200, "body": PRIMARY_BODY},
    )
    direct_vm.mock_web(
        r"evidence\.example/settle-corroboration\.txt",
        {"status": 200, "body": CORROBORATION_BODY},
    )


def _mock_judgment(
    direct_vm,
    policy_status,
    evidence_status="CORROBORATED",
    reason="controlled settlement judgment",
    pattern=r"policy-bound treasury spend request",
):
    direct_vm.mock_llm(
        pattern,
        json.dumps(
            {
                "policy_status": policy_status,
                "evidence_status": evidence_status,
                "reason": reason,
            }
        ),
    )


def test_compliant_correlated_request_approves_exact_amount(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    contract, vault_id, request_id, U = _setup(
        direct_vm, direct_deploy, direct_alice, direct_bob
    )
    _mock_evidence(direct_vm)
    _mock_judgment(direct_vm, "COMPLIANT", "CORROBORATED")

    with direct_vm.prank(direct_bob):
        contract.adjudicate_spend_request(request_id)

    assert direct_vm.run_validator() is True

    request = contract.get_spend_request(request_id)
    vault = contract.get_vault(vault_id)

    assert request.state == "APPROVED"
    assert request.policy_status == "COMPLIANT"
    assert request.evidence_status == "CORROBORATED"
    assert request.amount == U(AMOUNT)
    assert vault.reserved_balance == U(0)
    assert vault.current_period_reserved == U(0)
    assert vault.current_period_spent == U(AMOUNT)
    assert vault.lifetime_spent == U(AMOUNT)
    assert vault.balance == U(FUNDING - AMOUNT)
    assert contract.get_claimable(
        _runtime_address(contract, direct_alice)
    ) == U(AMOUNT)


def test_non_compliant_request_is_denied_with_zero_award(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    contract, vault_id, request_id, U = _setup(
        direct_vm, direct_deploy, direct_alice, direct_bob
    )
    _mock_evidence(direct_vm)
    _mock_judgment(direct_vm, "NON_COMPLIANT", "CORROBORATED")

    with direct_vm.prank(direct_bob):
        contract.adjudicate_spend_request(request_id)

    assert direct_vm.run_validator() is True
    request = contract.get_spend_request(request_id)
    vault = contract.get_vault(vault_id)

    assert request.state == "DENIED"
    assert request.policy_status == "NON_COMPLIANT"
    assert vault.reserved_balance == U(0)
    assert vault.current_period_reserved == U(0)
    assert vault.current_period_spent == U(0)
    assert vault.lifetime_spent == U(0)
    assert vault.balance == U(FUNDING)
    assert contract.get_claimable(
        _runtime_address(contract, direct_alice)
    ) == U(0)


def test_conflicting_evidence_is_denied(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    contract, _, request_id, U = _setup(
        direct_vm, direct_deploy, direct_alice, direct_bob
    )
    _mock_evidence(direct_vm)
    _mock_judgment(direct_vm, "COMPLIANT", "CONFLICTING")

    contract.adjudicate_spend_request(request_id)
    assert direct_vm.run_validator() is True

    request = contract.get_spend_request(request_id)
    assert request.state == "DENIED"
    assert request.evidence_status == "CONFLICTING"
    assert contract.get_claimable(
        _runtime_address(contract, direct_alice)
    ) == U(0)


def test_unclear_policy_is_denied(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    contract, _, request_id, U = _setup(
        direct_vm, direct_deploy, direct_alice, direct_bob
    )
    _mock_evidence(direct_vm)
    _mock_judgment(direct_vm, "UNCLEAR", "CORROBORATED")

    contract.adjudicate_spend_request(request_id)
    assert direct_vm.run_validator() is True

    assert contract.get_spend_request(request_id).state == "DENIED"
    assert contract.get_claimable(
        _runtime_address(contract, direct_alice)
    ) == U(0)


def test_owner_can_adjudicate(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    contract, _, request_id, _ = _setup(
        direct_vm, direct_deploy, direct_alice, direct_bob
    )
    _mock_evidence(direct_vm)
    _mock_judgment(direct_vm, "NON_COMPLIANT")

    contract.adjudicate_spend_request(request_id)
    assert direct_vm.run_validator() is True
    assert contract.get_spend_request(request_id).state == "DENIED"


def test_revoked_former_agent_cannot_adjudicate(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    contract, vault_id, request_id, _ = _setup(
        direct_vm, direct_deploy, direct_alice, direct_bob
    )

    contract.set_agent(vault_id, _runtime_address(contract, direct_alice))

    with direct_vm.prank(direct_bob):
        with direct_vm.expect_revert(
            "only vault owner or current authorized agent can adjudicate"
        ):
            contract.adjudicate_spend_request(request_id)

    assert contract.get_spend_request(request_id).state == "SUBMITTED"


def test_paused_vault_blocks_adjudication(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    contract, vault_id, request_id, _ = _setup(
        direct_vm, direct_deploy, direct_alice, direct_bob
    )
    contract.pause_vault(vault_id)

    with direct_vm.expect_revert("vault is paused"):
        contract.adjudicate_spend_request(request_id)

    assert contract.get_spend_request(request_id).state == "SUBMITTED"


def test_stale_at_adjudication_fails_closed_to_denied(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    contract, vault_id, request_id, U = _setup(
        direct_vm,
        direct_deploy,
        direct_alice,
        direct_bob,
        evidence_age=3_600,
    )

    direct_vm.warp("2026-08-21T04:00:01Z")
    contract.adjudicate_spend_request(request_id)

    request = contract.get_spend_request(request_id)
    vault = contract.get_vault(vault_id)

    assert request.state == "DENIED"
    assert request.policy_status == "UNCLEAR"
    assert request.evidence_status == "INSUFFICIENT"
    assert request.reason == "evidence stale at adjudication"
    assert vault.reserved_balance == U(0)
    assert vault.current_period_reserved == U(0)
    assert contract.get_claimable(
        _runtime_address(contract, direct_alice)
    ) == U(0)


def test_old_mandate_freshness_is_used_after_new_version(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    contract, vault_id, request_id, U = _setup(
        direct_vm,
        direct_deploy,
        direct_alice,
        direct_bob,
        evidence_age=3_600,
    )

    contract.create_mandate_version(
        vault_id,
        POLICY_V2,
        U(MAX_SINGLE),
        U(PERIOD_BUDGET),
        U(86_400),
    )

    direct_vm.warp("2026-08-21T04:00:01Z")
    contract.adjudicate_spend_request(request_id)

    request = contract.get_spend_request(request_id)
    assert request.state == "DENIED"
    assert request.reason == "evidence stale at adjudication"
    assert request.mandate_version == U(1)


def test_old_mandate_policy_text_is_used_after_update(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    contract, vault_id, request_id, U = _setup(
        direct_vm, direct_deploy, direct_alice, direct_bob
    )

    contract.create_mandate_version(
        vault_id,
        POLICY_V2,
        U(MAX_SINGLE),
        U(PERIOD_BUDGET),
        U(EVIDENCE_AGE),
    )

    _mock_evidence(direct_vm)
    _mock_judgment(
        direct_vm,
        "COMPLIANT",
        pattern=r"TOKEN_POLICY_V1",
    )

    contract.adjudicate_spend_request(request_id)
    assert direct_vm.run_validator() is True
    assert contract.get_spend_request(request_id).state == "APPROVED"


def test_digest_mismatch_leaves_request_pending_and_reserved(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    contract, vault_id, request_id, U = _setup(
        direct_vm, direct_deploy, direct_alice, direct_bob
    )
    direct_vm.mock_web(
        r"evidence\.example/settle-primary\.txt",
        {"status": 200, "body": "tampered"},
    )
    direct_vm.mock_web(
        r"evidence\.example/settle-corroboration\.txt",
        {"status": 200, "body": CORROBORATION_BODY},
    )

    with direct_vm.expect_revert("evidence digest mismatch"):
        contract.adjudicate_spend_request(request_id)

    assert contract.get_spend_request(request_id).state == "SUBMITTED"
    assert contract.get_vault(vault_id).reserved_balance == U(AMOUNT)


def test_malformed_llm_result_leaves_request_pending_and_reserved(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    contract, vault_id, request_id, U = _setup(
        direct_vm, direct_deploy, direct_alice, direct_bob
    )
    _mock_evidence(direct_vm)
    _mock_judgment(direct_vm, "INVALID")

    with direct_vm.expect_revert("LLM returned invalid policy_status"):
        contract.adjudicate_spend_request(request_id)

    assert contract.get_spend_request(request_id).state == "SUBMITTED"
    assert contract.get_vault(vault_id).reserved_balance == U(AMOUNT)


def test_approved_request_cannot_be_adjudicated_twice(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    contract, _, request_id, _ = _setup(
        direct_vm, direct_deploy, direct_alice, direct_bob
    )
    _mock_evidence(direct_vm)
    _mock_judgment(direct_vm, "COMPLIANT")

    contract.adjudicate_spend_request(request_id)
    assert direct_vm.run_validator() is True

    with direct_vm.expect_revert(
        "only submitted requests can be adjudicated"
    ):
        contract.adjudicate_spend_request(request_id)


def test_approval_after_rollover_converts_reserved_to_spent_without_extra_pressure(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    contract, vault_id, request_id, U = _setup(
        direct_vm, direct_deploy, direct_alice, direct_bob
    )

    direct_vm.warp(ROLLOVER_ISO)
    _mock_evidence(direct_vm)
    _mock_judgment(direct_vm, "COMPLIANT")

    contract.adjudicate_spend_request(request_id)
    assert direct_vm.run_validator() is True

    vault = contract.get_vault(vault_id)
    assert vault.period_started_at == U(TEST_TIME_UNIX + PERIOD_SECONDS)
    assert vault.current_period_reserved == U(0)
    assert vault.current_period_spent == U(AMOUNT)
    assert (
        vault.current_period_spent + vault.current_period_reserved
        == U(AMOUNT)
    )


def test_claimable_accumulates_exact_approved_amounts(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    contract, vault_id, first_id, U = _setup(
        direct_vm, direct_deploy, direct_alice, direct_bob
    )

    with direct_vm.prank(direct_bob):
        second_id = contract.create_spend_request(
            vault_id,
            _runtime_address(contract, direct_alice),
            U(2_000),
            "Second approved API invoice",
            CATEGORY,
            PRIMARY_URL,
            PRIMARY_SHA,
            CORROBORATION_URL,
            CORROBORATION_SHA,
            U(TEST_TIME_UNIX - 60),
        )

    _mock_evidence(direct_vm)
    _mock_judgment(direct_vm, "COMPLIANT")
    contract.adjudicate_spend_request(first_id)
    assert direct_vm.run_validator() is True

    direct_vm.clear_mocks()
    _mock_evidence(direct_vm)
    _mock_judgment(direct_vm, "COMPLIANT")
    contract.adjudicate_spend_request(second_id)
    assert direct_vm.run_validator() is True

    assert contract.get_claimable(
        _runtime_address(contract, direct_alice)
    ) == U(5_000)
    assert contract.get_vault(vault_id).lifetime_spent == U(5_000)
