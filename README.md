# Stake Manager

This contract manages the equities of stakeholders of a project.
It allows each stakeholders' stake to be updated at specfied interval and
new stakeholders to be added within a stipulated window.

The frequency of the payments (paymentInterval) to all the stakeholders
of a project can be initialised to monthly and the window during which
stakes can be updated, can also be 7 days.

Funds or ether tokens received in the contract can only be distributed
outside the update window. The update window opens after every 30 days
for just 7 days in this example.

The contract implements a manager and pauser roles. Only the manager
can add beneficiaries (stakeholders) and update the stakes of each
beneficiary during the update within. The pauser can stop any further
external interaction with the contract. This is helpful in an unlikely
case of exploit.

The contract can only receive and hold ether.

## Testing

The unit tests are still be written to attain 100% coverage.
