import hashlib
import json
import sys


TEST_TIME_ISO = "2026-08-21T03:00:00Z"
TEST_TIME_UNIX = 1787281200

TITLE = "Treasury recovery test vault"
POLICY = (
    "Cloud infrastructure and approved API service invoices are permitted. "
    "Personal purchases are prohibited."
)
PURPOSE = "Pay production API invoice"
CATEGORY = "API_SERVICES"

FUNDING = 20_000
REQUEST_AMOUNT = 3_000
MAX_SINGLE = 7_000
PERIOD_BUDGET = 10_000
PERIOD_SECONDS = 3_600
EVIDENCE_AGE = 7_200

PRIMARY_URL = "https:" + "//evidence.example/recovery-primary.txt"
CORROBORATION_URL = "https:" + "//evidence.example/recovery-corroboration.txt"
PRIMARY_BODY = "Recovery test API invoice: amount 3000 wei, approved service."
CORROBORATION_BODY = "Recovery test operations record confirms the same API invoice."
PRIMARY_SHA = hashlib.sha256(PRIMARY_BODY.encode("utf-8")).hexdigest()
CORROBORATION_SHA = hashlib.sha256(
    CORROBORATION_BODY.encode("utf-8")
).hexdigest()


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
    *,
    funding=FUNDING,
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
        POLICY,
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
    recipient,
    amount=REQUEST_AMOUNT,
):
    with direct_vm.prank(agent):
        return contract.create_spend_request(
            vault_id,
            _runtime_address(contract, recipient),
            U(amount),
            PURPOSE,
            CATEGORY,
            PRIMARY_URL,
            PRIMARY_SHA,
            CORROBORATION_URL,
            CORROBORATION_SHA,
            U(TEST_TIME_UNIX - 60),
        )


def _mock_approval(direct_vm):
    direct_vm.mock_web(
        r"evidence\.example/recovery-primary\.txt",
        {"status": 200, "body": PRIMARY_BODY},
    )
    direct_vm.mock_web(
        r"evidence\.example/recovery-corroboration\.txt",
        {"status": 200, "body": CORROBORATION_BODY},
    )
    direct_vm.mock_llm(
        r"policy-bound treasury spend request",
        json.dumps(
            {
                "policy_status": "COMPLIANT",
                "evidence_status": "CORROBORATED",
                "reason": "approved service expense",
            }
        ),
    )


def test_owner_recovery_moves_exact_unreserved_amount_to_claimable(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    contract, vault_id, U = _setup(
        direct_vm, direct_deploy, direct_alice, direct_bob
    )

    contract.withdraw_unreserved(vault_id, U(5_000))

    vault = contract.get_vault(vault_id)
    assert vault.balance == U(FUNDING - 5_000)
    assert vault.reserved_balance == U(0)
    assert contract.get_claimable(
        _runtime_address(contract, direct_alice)
    ) == U(5_000)


def test_zero_recovery_is_rejected(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    contract, vault_id, U = _setup(
        direct_vm, direct_deploy, direct_alice, direct_bob
    )

    with direct_vm.expect_revert("recovery amount must be positive"):
        contract.withdraw_unreserved(vault_id, U(0))


def test_non_owner_cannot_recover_vault_funds(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    contract, vault_id, U = _setup(
        direct_vm, direct_deploy, direct_alice, direct_bob
    )

    with direct_vm.prank(direct_bob):
        with direct_vm.expect_revert("only vault owner can perform this action"):
            contract.withdraw_unreserved(vault_id, U(1_000))


def test_pending_reservation_is_not_recoverable(
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

    with direct_vm.expect_revert(
        "amount exceeds unreserved vault balance"
    ):
        contract.withdraw_unreserved(
            vault_id,
            U(FUNDING - REQUEST_AMOUNT + 1),
        )

    request = contract.get_spend_request(request_id)
    vault = contract.get_vault(vault_id)
    assert request.state == "SUBMITTED"
    assert vault.balance == U(FUNDING)
    assert vault.reserved_balance == U(REQUEST_AMOUNT)
    assert vault.current_period_reserved == U(REQUEST_AMOUNT)


def test_owner_can_recover_exactly_all_unreserved_while_request_is_pending(
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

    recoverable = FUNDING - REQUEST_AMOUNT
    contract.withdraw_unreserved(vault_id, U(recoverable))

    vault = contract.get_vault(vault_id)
    request = contract.get_spend_request(request_id)

    assert vault.balance == U(REQUEST_AMOUNT)
    assert vault.reserved_balance == U(REQUEST_AMOUNT)
    assert vault.current_period_reserved == U(REQUEST_AMOUNT)
    assert request.state == "SUBMITTED"
    assert contract.get_claimable(
        _runtime_address(contract, direct_alice)
    ) == U(recoverable)


def test_recovery_is_allowed_while_vault_is_paused(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    contract, vault_id, U = _setup(
        direct_vm, direct_deploy, direct_alice, direct_bob
    )

    contract.pause_vault(vault_id)
    contract.withdraw_unreserved(vault_id, U(4_000))

    vault = contract.get_vault(vault_id)
    assert vault.status == "PAUSED"
    assert vault.balance == U(FUNDING - 4_000)
    assert contract.get_claimable(
        _runtime_address(contract, direct_alice)
    ) == U(4_000)


def test_recovery_does_not_count_as_agent_spend(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    contract, vault_id, U = _setup(
        direct_vm, direct_deploy, direct_alice, direct_bob
    )
    before = contract.get_vault(vault_id)

    contract.withdraw_unreserved(vault_id, U(4_000))
    after = contract.get_vault(vault_id)

    assert after.lifetime_spent == before.lifetime_spent == U(0)
    assert after.current_period_spent == before.current_period_spent == U(0)
    assert (
        after.current_period_reserved
        == before.current_period_reserved
        == U(0)
    )


def test_cancellation_releases_funds_for_owner_recovery(
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

    contract.cancel_spend_request(request_id)
    contract.withdraw_unreserved(vault_id, U(FUNDING))

    assert contract.get_spend_request(request_id).state == "CANCELLED"
    assert contract.get_vault(vault_id).balance == U(0)
    assert contract.get_claimable(
        _runtime_address(contract, direct_alice)
    ) == U(FUNDING)


def test_withdraw_rejects_when_nothing_is_claimable(
    direct_vm,
    direct_deploy,
    direct_alice,
):
    direct_vm.check_pickling = True
    contract = direct_deploy("contracts/omnimandate.py")
    direct_vm.sender = direct_alice

    with direct_vm.expect_revert("nothing to withdraw"):
        contract.withdraw()


def test_direct_mode_insufficient_chain_balance_preserves_recovery_claim(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    contract, vault_id, U = _setup(
        direct_vm, direct_deploy, direct_alice, direct_bob
    )
    contract.withdraw_unreserved(vault_id, U(5_000))

    # Proven Direct Mode limitation: assigning gl.message.value exercises the
    # contract's payable/accounting path but does not itself populate
    # VMContext._balances, so self.balance remains insufficient for transfer.
    with direct_vm.expect_revert("contract balance is insufficient"):
        contract.withdraw()

    assert contract.get_claimable(
        _runtime_address(contract, direct_alice)
    ) == U(5_000)
    assert contract.get_vault(vault_id).balance == U(FUNDING - 5_000)


def test_approved_claim_and_owner_recovery_accumulate_without_double_spend(
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

    _mock_approval(direct_vm)
    contract.adjudicate_spend_request(request_id)
    assert direct_vm.run_validator() is True

    # After approval, internal vault balance already excludes the recipient
    # award. Recovery can only convert the remaining vault allocation.
    contract.withdraw_unreserved(vault_id, U(5_000))

    vault = contract.get_vault(vault_id)
    assert vault.balance == U(FUNDING - REQUEST_AMOUNT - 5_000)
    assert vault.lifetime_spent == U(REQUEST_AMOUNT)
    assert contract.get_claimable(
        _runtime_address(contract, direct_alice)
    ) == U(REQUEST_AMOUNT + 5_000)


def test_failed_external_withdrawal_does_not_mutate_settlement_record(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    contract, _, U = _setup(
        direct_vm, direct_deploy, direct_alice, direct_bob
    )
    vault_id = U(1)
    request_id = _create_request(
        contract,
        direct_vm,
        U,
        vault_id,
        direct_bob,
        direct_alice,
    )

    _mock_approval(direct_vm)
    contract.adjudicate_spend_request(request_id)
    assert direct_vm.run_validator() is True

    before = contract.get_spend_request(request_id)

    with direct_vm.expect_revert("contract balance is insufficient"):
        contract.withdraw()

    after = contract.get_spend_request(request_id)
    assert after.state == before.state == "APPROVED"
    assert after.amount == before.amount == U(REQUEST_AMOUNT)
    assert after.policy_status == before.policy_status == "COMPLIANT"
    assert (
        after.evidence_status
        == before.evidence_status
        == "CORROBORATED"
    )
    assert contract.get_claimable(
        _runtime_address(contract, direct_alice)
    ) == U(REQUEST_AMOUNT)
