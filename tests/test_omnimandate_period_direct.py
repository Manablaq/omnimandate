import sys


TEST_TIME_ISO = "2026-08-21T03:00:00Z"
START_TS = 1787281200

TITLE = "Period accounting test vault"
POLICY = "Only infrastructure purchases that satisfy the mandate are permitted."
POLICY_2 = "Infrastructure and security audit purchases are permitted."

PERIOD_SECONDS = 3_600
MAX_SINGLE = 2_000
PERIOD_BUDGET = 8_000
EVIDENCE_AGE = 86_400


def _runtime_address(contract, raw):
    instance = object.__getattribute__(contract, "_instance")
    contract_module = sys.modules[type(instance).__module__]
    Address = contract_module.Address
    return Address(raw)


def _setup(direct_vm, direct_deploy, owner, agent):
    direct_vm.check_pickling = True
    direct_vm.warp(TEST_TIME_ISO)
    contract = direct_deploy("contracts/omnimandate.py")
    U = type(contract.next_vault_id)
    direct_vm.sender = owner
    direct_vm.value = 0
    vault_id = contract.create_vault(
        _runtime_address(contract, agent),
        TITLE,
        POLICY,
        U(MAX_SINGLE),
        U(PERIOD_BUDGET),
        U(PERIOD_SECONDS),
        U(EVIDENCE_AGE),
    )
    return contract, vault_id, U


def _new_mandate(contract, vault_id, U, budget=PERIOD_BUDGET):
    return contract.create_mandate_version(
        vault_id,
        POLICY_2,
        U(MAX_SINGLE),
        U(budget),
        U(EVIDENCE_AGE),
    )


def test_no_period_rollover_before_boundary(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    contract, vault_id, U = _setup(
        direct_vm, direct_deploy, direct_alice, direct_bob
    )

    direct_vm.warp("2026-08-21T03:59:59Z")
    _new_mandate(contract, vault_id, U)

    vault = contract.get_vault(vault_id)
    assert vault.period_started_at == U(START_TS)


def test_period_rollover_at_exact_boundary(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    contract, vault_id, U = _setup(
        direct_vm, direct_deploy, direct_alice, direct_bob
    )

    direct_vm.warp("2026-08-21T04:00:00Z")
    _new_mandate(contract, vault_id, U)

    vault = contract.get_vault(vault_id)
    assert vault.period_started_at == U(START_TS + PERIOD_SECONDS)
    assert vault.current_period_spent == U(0)
    assert vault.current_period_reserved == U(0)


def test_multiple_elapsed_periods_advance_to_latest_full_boundary(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    contract, vault_id, U = _setup(
        direct_vm, direct_deploy, direct_alice, direct_bob
    )

    direct_vm.warp("2026-08-21T06:30:00Z")
    _new_mandate(contract, vault_id, U)

    vault = contract.get_vault(vault_id)
    assert vault.period_started_at == U(START_TS + 3 * PERIOD_SECONDS)


def test_safe_budget_increase_after_sync(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    contract, vault_id, U = _setup(
        direct_vm, direct_deploy, direct_alice, direct_bob
    )

    direct_vm.warp("2026-08-21T04:00:00Z")
    _new_mandate(contract, vault_id, U, budget=10_000)

    assert contract.get_active_mandate(vault_id).period_budget == U(10_000)


def test_period_length_is_vault_level_across_mandate_versions(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    contract, vault_id, U = _setup(
        direct_vm, direct_deploy, direct_alice, direct_bob
    )

    before = contract.get_vault(vault_id).period_seconds
    _new_mandate(contract, vault_id, U)
    after = contract.get_vault(vault_id).period_seconds

    assert before == U(PERIOD_SECONDS)
    assert after == before
