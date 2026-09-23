# Demo script

1. Launch the backend and frontend, then open `http://localhost:5173`.
2. Select IEK and use the default calculation parameters.
3. Run the calculation and open the explanation of `IEK-001`: show the seasonal factor, stockout correction, current balance and in-transit quantity.
4. Open `IEK-002`: show the `customer_transaction_outlier_excluded=demo_fixture` traceability marker. It is a synthetic demonstration and does not change the current recommendation.
5. Change the seasonal date to January and rerun; the seasonal factor and target demand change.
6. Switch to Systeme Electric to show a separate supplier group and rounding multiple.
7. Change a line quantity, tick the explicit confirmation, and export the prepared CSV. Without confirmation export is refused; a negative or fractional quantity is refused, and any later edit requires reconfirmation.

The application prepares recommendations only. It does not create or send a supplier order automatically.
