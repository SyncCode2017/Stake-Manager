# Stake Manager

This contract manages the equities of stakeholders of a project.
It allows each stakeholder's stake to be updated at specified interval and
new stakeholders to be added within a stipulated window.

The frequency of the payments (paymentInterval) to all the stakeholders
of a project can be initialised to monthly and the window during which
stakes can be updated, can also be 7 days. The contract allows the manager
to add beneficiaries in the first 30 days but subsequent update can only
be done during the stipulated update window.

Funds or ether tokens received in the contract can only be distributed
outside the update window. The update window opens after every 30 days
for just 7 days in this example.

The contract implements manager and pauser roles. Only the manager
can add beneficiaries (stakeholders) and update the stakes of each
beneficiary during the update window. The pauser can stop any further
external interaction with the contract. This is helpful in an unlikely
case of exploit.

The contract can only receive and hold ether.
