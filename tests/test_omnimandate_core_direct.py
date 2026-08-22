import hashlib
import sys


TEST_TIME_ISO = "2026-08-21T03:00:00Z"
TEST_TIME_UNIX = 1787281200

TITLE = "Autonomous infrastructure treasury"
POLICY_V1 = (
    "The treasury may fund cloud infrastructure, developer tools, security "
    "services, and approved APIs. Personal purchases are prohibited."
)
POLICY_V2 = (
    "The treasury may fund cloud infrastructure, developer tools, security "
    "services, approved APIs, and independent software audits. Personal "
    "purchases are prohibited."
)

INITIAL_FUNDING = 10_000
TOP_UP = 2_500
MAX_SINGLE = 2_000
PERIOD_BUDGET = 8_000
PERIOD_SECONDS = 3_600
EVIDENCE_AGE = 86_400


def _runtime_address(contract, raw):
    instance = object.__getattribute__(contract, "_instance")
    contract_module = sys.modules[type(instance).__module__]
    Address = contract_module.Address
    return Address(raw)


def _as_studio_integer(raw: bytes) -> int:
    return int.from_bytes(raw, "big")


def _deploy(direct_vm, direct_deploy):
    direct_vm.check_pickling = True
    direct_vm.warp(TEST_TIME_ISO)
    return direct_deploy("contracts/omnimandate.py")


def _create_vault(
    contract,
    direct_vm,
    owner,
    agent,
    value=INITIAL_FUNDING,
    period_budget=PERIOD_BUDGET,
):
    U = type(contract.next_vault_id)
    direct_vm.sender = owner
    direct_vm.value = value

    vault_id = contract.create_vault(
        _runtime_address(contract, agent),
        TITLE,
        POLICY_V1,
        U(MAX_SINGLE),
        U(period_budget),
        U(PERIOD_SECONDS),
        U(EVIDENCE_AGE),
    )
    direct_vm.value = 0
    return vault_id, U


def test_create_zero_funded_vault_and_initial_mandate(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    contract = _deploy(direct_vm, direct_deploy)
    vault_id, U = _create_vault(
        contract,
        direct_vm,
        direct_alice,
        direct_bob,
        value=0,
    )

    assert vault_id == U(1)
    assert contract.get_vault_count() == U(1)
    assert contract.get_mandate_count() == U(1)

    vault = contract.get_vault(vault_id)
    mandate = contract.get_mandate(vault_id, U(1))

    assert vault.owner.as_bytes == direct_alice
    assert vault.authorized_agent.as_bytes == direct_bob
    assert vault.balance == U(0)
    assert vault.reserved_balance == U(0)
    assert vault.current_period_spent == U(0)
    assert vault.current_period_reserved == U(0)
    assert vault.period_started_at == U(TEST_TIME_UNIX)
    assert vault.period_seconds == U(PERIOD_SECONDS)
    assert vault.active_mandate_version == U(1)
    assert vault.status == "ACTIVE"

    assert mandate.vault_id == vault_id
    assert mandate.version == U(1)
    assert mandate.previous_mandate_id == U(0)
    assert mandate.policy_text == POLICY_V1
    assert mandate.policy_sha256 == hashlib.sha256(POLICY_V1.encode()).hexdigest()
    assert mandate.max_single_spend == U(MAX_SINGLE)
    assert mandate.period_budget == U(PERIOD_BUDGET)


def test_create_funded_vault_tracks_internal_balance(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    contract = _deploy(direct_vm, direct_deploy)
    vault_id, U = _create_vault(
        contract,
        direct_vm,
        direct_alice,
        direct_bob,
    )

    assert contract.get_vault(vault_id).balance == U(INITIAL_FUNDING)


def test_owner_can_fund_vault_and_zero_topup_is_rejected(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    contract = _deploy(direct_vm, direct_deploy)
    vault_id, U = _create_vault(contract, direct_vm, direct_alice, direct_bob)

    direct_vm.value = TOP_UP
    contract.fund_vault(vault_id)
    direct_vm.value = 0

    assert contract.get_vault(vault_id).balance == U(INITIAL_FUNDING + TOP_UP)

    with direct_vm.expect_revert("funding value must be positive"):
        contract.fund_vault(vault_id)


def test_non_owner_cannot_fund_vault(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    contract = _deploy(direct_vm, direct_deploy)
    vault_id, _ = _create_vault(contract, direct_vm, direct_alice, direct_bob)

    direct_vm.value = TOP_UP
    with direct_vm.prank(direct_bob):
        with direct_vm.expect_revert("only vault owner can perform this action"):
            contract.fund_vault(vault_id)
    direct_vm.value = 0


def test_owner_can_replace_agent_and_non_owner_cannot(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    contract = _deploy(direct_vm, direct_deploy)
    vault_id, _ = _create_vault(contract, direct_vm, direct_alice, direct_bob)

    # v1 permits the owner to also act as the active agent.
    contract.set_agent(vault_id, _runtime_address(contract, direct_alice))
    assert contract.get_vault(vault_id).authorized_agent.as_bytes == direct_alice

    with direct_vm.prank(direct_bob):
        with direct_vm.expect_revert("only vault owner can perform this action"):
            contract.set_agent(vault_id, _runtime_address(contract, direct_bob))


def test_bradbury_integer_encoded_agent_is_normalized(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    contract = _deploy(direct_vm, direct_deploy)
    U = type(contract.next_vault_id)

    direct_vm.sender = direct_alice
    direct_vm.value = 0
    vault_id = contract.create_vault(
        _as_studio_integer(direct_bob),
        TITLE,
        POLICY_V1,
        U(MAX_SINGLE),
        U(PERIOD_BUDGET),
        U(PERIOD_SECONDS),
        U(EVIDENCE_AGE),
    )

    assert contract.get_vault(vault_id).authorized_agent == _runtime_address(
        contract, direct_bob
    )


def test_pause_resume_and_duplicate_transitions(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    contract = _deploy(direct_vm, direct_deploy)
    vault_id, _ = _create_vault(contract, direct_vm, direct_alice, direct_bob)

    contract.pause_vault(vault_id)
    assert contract.get_vault(vault_id).status == "PAUSED"

    with direct_vm.expect_revert("vault is already paused"):
        contract.pause_vault(vault_id)

    contract.resume_vault(vault_id)
    assert contract.get_vault(vault_id).status == "ACTIVE"

    with direct_vm.expect_revert("vault is already active"):
        contract.resume_vault(vault_id)


def test_non_owner_cannot_pause_or_resume(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    contract = _deploy(direct_vm, direct_deploy)
    vault_id, _ = _create_vault(contract, direct_vm, direct_alice, direct_bob)

    with direct_vm.prank(direct_bob):
        with direct_vm.expect_revert("only vault owner can perform this action"):
            contract.pause_vault(vault_id)

    contract.pause_vault(vault_id)

    with direct_vm.prank(direct_bob):
        with direct_vm.expect_revert("only vault owner can perform this action"):
            contract.resume_vault(vault_id)


def test_mandate_v2_preserves_v1_and_updates_active_pointer(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    contract = _deploy(direct_vm, direct_deploy)
    vault_id, U = _create_vault(contract, direct_vm, direct_alice, direct_bob)

    v1 = contract.get_mandate(vault_id, U(1))
    v1_hash = v1.policy_sha256

    mandate_id = contract.create_mandate_version(
        vault_id,
        POLICY_V2,
        U(2500),
        U(9000),
        U(EVIDENCE_AGE),
    )

    assert mandate_id == U(2)
    assert contract.get_mandate_count() == U(2)

    vault = contract.get_vault(vault_id)
    v1_after = contract.get_mandate(vault_id, U(1))
    v2 = contract.get_mandate(vault_id, U(2))
    active = contract.get_active_mandate(vault_id)

    assert vault.active_mandate_id == mandate_id
    assert vault.active_mandate_version == U(2)
    assert v1_after.policy_text == POLICY_V1
    assert v1_after.policy_sha256 == v1_hash
    assert v2.policy_text == POLICY_V2
    assert v2.previous_mandate_id == U(1)
    assert active.version == U(2)
    assert contract.get_mandate_by_id(mandate_id).version == U(2)


def test_non_owner_cannot_create_mandate_version(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    contract = _deploy(direct_vm, direct_deploy)
    vault_id, U = _create_vault(contract, direct_vm, direct_alice, direct_bob)

    with direct_vm.prank(direct_bob):
        with direct_vm.expect_revert("only vault owner can perform this action"):
            contract.create_mandate_version(
                vault_id,
                POLICY_V2,
                U(2500),
                U(9000),
                U(EVIDENCE_AGE),
            )


def test_missing_mandate_version_reverts(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    contract = _deploy(direct_vm, direct_deploy)
    vault_id, U = _create_vault(contract, direct_vm, direct_alice, direct_bob)

    with direct_vm.expect_revert("mandate version does not exist"):
        contract.get_mandate(vault_id, U(2))


def test_invalid_initial_policy_bounds_revert(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    contract = _deploy(direct_vm, direct_deploy)
    U = type(contract.next_vault_id)
    direct_vm.sender = direct_alice
    direct_vm.value = 0

    with direct_vm.expect_revert(
        "max_single_spend cannot exceed period_budget"
    ):
        contract.create_vault(
            _runtime_address(contract, direct_bob),
            TITLE,
            POLICY_V1,
            U(9_000),
            U(8_000),
            U(PERIOD_SECONDS),
            U(EVIDENCE_AGE),
        )
