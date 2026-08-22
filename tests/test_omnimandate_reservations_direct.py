import sys


TEST_TIME_ISO = "2026-08-21T03:00:00Z"
TEST_TIME_UNIX = 1787281200
ROLLOVER_ISO = "2026-08-21T04:00:00Z"

TITLE = "Reservation accounting treasury"
POLICY = "Infrastructure and approved API operating expenses are permitted."
POLICY_V2 = "Infrastructure, approved APIs, and security audits are permitted."

PURPOSE = "Production infrastructure invoice"
CATEGORY = "INFRASTRUCTURE"

PRIMARY_URL = "https:" + "//evidence.example/reservation-primary.json"
CORROBORATION_URL = "https:" + "//evidence.example/reservation-corroboration.json"
PRIMARY_SHA = "c" * 64
CORROBORATION_SHA = "d" * 64

MAX_SINGLE = 7_000
PERIOD_BUDGET = 8_000
PERIOD_SECONDS = 3_600
EVIDENCE_AGE = 3_600
OBSERVED_AT = TEST_TIME_UNIX - 30


def _runtime_address(contract, raw):
    instance = object.__getattribute__(contract, "_instance")
    contract_module = sys.modules[type(instance).__module__]
    Address = contract_module.Address
    return Address(raw)


def _setup(direct_vm, direct_deploy, owner, agent, funding=20_000):
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


def _request(contract, direct_vm, U, vault_id, agent, recipient, amount):
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
            U(OBSERVED_AT),
        )


def test_insufficient_unreserved_balance_rejects_second_request(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    contract, vault_id, U = _setup(
        direct_vm, direct_deploy, direct_alice, direct_bob, funding=5_000
    )

    _request(
        contract, direct_vm, U, vault_id, direct_bob, direct_alice, 3_000
    )

    with direct_vm.prank(direct_bob):
        with direct_vm.expect_revert(
            "insufficient unreserved vault balance"
        ):
            contract.create_spend_request(
                vault_id,
                _runtime_address(contract, direct_alice),
                U(2_500),
                PURPOSE,
                CATEGORY,
                PRIMARY_URL,
                PRIMARY_SHA,
                CORROBORATION_URL,
                CORROBORATION_SHA,
                U(OBSERVED_AT),
            )


def test_period_budget_prevents_concurrent_oversubscription(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    contract, vault_id, U = _setup(
        direct_vm, direct_deploy, direct_alice, direct_bob
    )

    _request(
        contract, direct_vm, U, vault_id, direct_bob, direct_alice, 5_000
    )

    with direct_vm.prank(direct_bob):
        with direct_vm.expect_revert(
            "request exceeds available period budget"
        ):
            contract.create_spend_request(
                vault_id,
                _runtime_address(contract, direct_alice),
                U(4_000),
                PURPOSE,
                CATEGORY,
                PRIMARY_URL,
                PRIMARY_SHA,
                CORROBORATION_URL,
                CORROBORATION_SHA,
                U(OBSERVED_AT),
            )

    vault = contract.get_vault(vault_id)
    assert vault.current_period_reserved == U(5_000)
    assert vault.reserved_balance == U(5_000)
    assert contract.get_request_count() == U(1)


def test_owner_cancellation_releases_reservation_once(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    contract, vault_id, U = _setup(
        direct_vm, direct_deploy, direct_alice, direct_bob
    )

    request_id = _request(
        contract, direct_vm, U, vault_id, direct_bob, direct_alice, 3_000
    )
    contract.cancel_spend_request(request_id)

    request = contract.get_spend_request(request_id)
    vault = contract.get_vault(vault_id)

    assert request.state == "CANCELLED"
    assert request.resolved_at != ""
    assert vault.reserved_balance == U(0)
    assert vault.current_period_reserved == U(0)
    assert vault.balance == U(20_000)

    with direct_vm.expect_revert(
        "only submitted requests can be cancelled"
    ):
        contract.cancel_spend_request(request_id)

    vault_after = contract.get_vault(vault_id)
    assert vault_after.reserved_balance == U(0)
    assert vault_after.current_period_reserved == U(0)


def test_original_requester_can_cancel_after_agent_revocation(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    contract, vault_id, U = _setup(
        direct_vm, direct_deploy, direct_alice, direct_bob
    )

    request_id = _request(
        contract, direct_vm, U, vault_id, direct_bob, direct_alice, 3_000
    )

    contract.set_agent(vault_id, _runtime_address(contract, direct_alice))

    with direct_vm.prank(direct_bob):
        contract.cancel_spend_request(request_id)

    assert contract.get_spend_request(request_id).state == "CANCELLED"
    assert contract.get_vault(vault_id).reserved_balance == U(0)


def test_pause_still_allows_owner_cancellation(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    contract, vault_id, U = _setup(
        direct_vm, direct_deploy, direct_alice, direct_bob
    )

    request_id = _request(
        contract, direct_vm, U, vault_id, direct_bob, direct_alice, 3_000
    )

    contract.pause_vault(vault_id)
    contract.cancel_spend_request(request_id)

    assert contract.get_vault(vault_id).status == "PAUSED"
    assert contract.get_spend_request(request_id).state == "CANCELLED"
    assert contract.get_vault(vault_id).current_period_reserved == U(0)


def test_rollover_preserves_unresolved_reservation(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    contract, vault_id, U = _setup(
        direct_vm, direct_deploy, direct_alice, direct_bob
    )

    _request(
        contract, direct_vm, U, vault_id, direct_bob, direct_alice, 3_000
    )

    direct_vm.warp(ROLLOVER_ISO)
    contract.create_mandate_version(
        vault_id,
        POLICY_V2,
        U(MAX_SINGLE),
        U(PERIOD_BUDGET),
        U(EVIDENCE_AGE),
    )

    vault = contract.get_vault(vault_id)
    assert vault.period_started_at == U(TEST_TIME_UNIX + PERIOD_SECONDS)
    assert vault.current_period_spent == U(0)
    assert vault.current_period_reserved == U(3_000)
    assert vault.reserved_balance == U(3_000)


def test_old_reservation_consumes_new_period_capacity(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    contract, vault_id, U = _setup(
        direct_vm, direct_deploy, direct_alice, direct_bob
    )

    _request(
        contract, direct_vm, U, vault_id, direct_bob, direct_alice, 3_000
    )

    direct_vm.warp(ROLLOVER_ISO)

    # The second request must use evidence that is still fresh after rollover.
    # Otherwise freshness correctly fails before the period-budget invariant is
    # reached, which would make this test assert the wrong failure condition.
    rollover_observed_at = TEST_TIME_UNIX + PERIOD_SECONDS - 30

    with direct_vm.prank(direct_bob):
        with direct_vm.expect_revert(
            "request exceeds available period budget"
        ):
            contract.create_spend_request(
                vault_id,
                _runtime_address(contract, direct_alice),
                U(6_000),
                PURPOSE,
                CATEGORY,
                PRIMARY_URL,
                PRIMARY_SHA,
                CORROBORATION_URL,
                CORROBORATION_SHA,
                U(rollover_observed_at),
            )

    vault = contract.get_vault(vault_id)
    assert vault.period_started_at == U(TEST_TIME_UNIX + PERIOD_SECONDS)
    assert vault.current_period_reserved == U(3_000)


def test_safe_budget_decrease_above_current_pressure_is_allowed(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    contract, vault_id, U = _setup(
        direct_vm, direct_deploy, direct_alice, direct_bob
    )

    _request(
        contract, direct_vm, U, vault_id, direct_bob, direct_alice, 3_000
    )

    contract.create_mandate_version(
        vault_id,
        POLICY_V2,
        U(3_500),
        U(4_000),
        U(EVIDENCE_AGE),
    )

    assert contract.get_active_mandate(vault_id).period_budget == U(4_000)
    assert contract.get_vault(vault_id).current_period_reserved == U(3_000)


def test_budget_decrease_below_current_pressure_is_rejected(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    contract, vault_id, U = _setup(
        direct_vm, direct_deploy, direct_alice, direct_bob
    )

    _request(
        contract, direct_vm, U, vault_id, direct_bob, direct_alice, 3_000
    )

    with direct_vm.expect_revert(
        "new period budget cannot be below current spent plus reserved"
    ):
        contract.create_mandate_version(
            vault_id,
            POLICY_V2,
            U(2_000),
            U(2_999),
            U(EVIDENCE_AGE),
        )

    assert contract.get_active_mandate(vault_id).version == U(1)
    assert contract.get_vault(vault_id).current_period_reserved == U(3_000)
