# Implementation Plan

- [x] 1. Create styled components for payment methods section





  - Create `MetodosPagoSection` styled component with same styling as `FormContainer`
  - Create `ListaMetodosPago` grid container for payment method cards
  - Create `MetodoPagoCard` styled component for individual payment method display
  - Create `EmptyState` styled component for when no payment methods exist
  - Create `FormMetodoContainer` styled component for the payment method form
  - Create `ActionButton` styled components for edit/delete/save/cancel buttons
  - Ensure all components use consistent colors, borders, shadows, and transitions from existing design
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [-] 2. Implement payment methods list display

  - Add `MetodosPagoSection` component after the general data `FormContainer` in the JSX
  - Add section title "Métodos de Pago" using existing `SectionTitle` component
  - Implement conditional rendering: show `EmptyState` when `metodosPago.length === 0`, otherwise show `ListaMetodosPago`
  - Map through `metodosPago` array to render `MetodoPagoCard` for each payment method
  - Display all required fields in each card: nombre, banco, numeroCuenta, titular, moneda
  - Add edit button to each card that calls `handleEditarMetodo(metodo)`
  - Add delete button to each card that calls `handleEliminarMetodo(metodo.id)`
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ]* 2.1 Write property test for payment method display completeness
  - **Property 1: Payment method display completeness**
  - **Validates: Requirements 1.2**

- [ ]* 2.2 Write property test for payment method list ordering
  - **Property 2: Payment method list ordering**
  - **Validates: Requirements 1.4**


- [ ] 3. Implement payment method form UI
  - Add `FormMetodoContainer` below the section title
  - Create form with `onSubmit={handleGuardarMetodo}` (function already exists)
  - Add text input for `nombre` bound to `formMetodo.nombre`
  - Add text input for `banco` bound to `formMetodo.banco`
  - Add text input for `numeroCuenta` bound to `formMetodo.numeroCuenta`
  - Add text input for `titular` bound to `formMetodo.titular`
  - Add select input for `moneda` with options "NIO" and "USD", bound to `formMetodo.moneda`
  - Add save button with text "Guardar" or "Actualizar" based on `editandoMetodo` state
  - Add cancel button (visible only when `editandoMetodo !== null`) that clears form and sets `editandoMetodo` to null
  - Add visual indicator (e.g., badge or text) when `editandoMetodo !== null` showing "Editando método"
  - Apply consistent input styling with border color `#5a6d90` matching existing inputs
  - _Requirements: 2.1, 3.2, 6.1_

- [ ]* 3.1 Write property test for required field validation
  - **Property 3: Required field validation**
  - **Validates: Requirements 2.2, 2.6**

- [ ]* 3.2 Write property test for default currency value
  - **Property 14: Default currency value**
  - **Validates: Requirements 6.2**

- [ ]* 3.3 Write property test for edit currency preservation
  - **Property 15: Edit currency preservation**
  - **Validates: Requirements 6.3**

- [ ] 4. Verify existing form handlers work correctly with new UI
  - Test that `handleGuardarMetodo` is called on form submit
  - Verify that validation logic prevents submission when required fields are empty
  - Verify that success/error toasts appear after API responses
  - Verify that `fetchMetodosPago` is called after successful create/update/delete
  - Verify that form is cleared after successful operations
  - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.6_

- [ ]* 4.1 Write property test for create request data integrity
  - **Property 4: Create request data integrity**
  - **Validates: Requirements 2.3**

- [ ]* 4.2 Write property test for successful operation feedback
  - **Property 5: Successful operation feedback**
  - **Validates: Requirements 2.4, 3.4, 4.3**

- [ ]* 4.3 Write property test for error response handling
  - **Property 6: Error response handling**
  - **Validates: Requirements 2.5, 4.4**

- [ ]* 4.4 Write property test for currency inclusion in requests
  - **Property 16: Currency inclusion in requests**
  - **Validates: Requirements 6.4**

- [ ] 5. Verify edit functionality with new UI
  - Test that clicking edit button on a payment method card calls `handleEditarMetodo`
  - Verify that form is populated with the selected payment method's data
  - Verify that `editandoMetodo` state is set to the method's id
  - Verify that visual indicator appears when in edit mode
  - Verify that cancel button clears form and exits edit mode
  - Verify that save button sends PUT request with updated data
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ]* 5.1 Write property test for edit mode form population
  - **Property 7: Edit mode form population**
  - **Validates: Requirements 3.1**

- [ ]* 5.2 Write property test for edit mode visual indicator
  - **Property 8: Edit mode visual indicator**
  - **Validates: Requirements 3.2**

- [ ]* 5.3 Write property test for update request data integrity
  - **Property 9: Update request data integrity**
  - **Validates: Requirements 3.3**

- [ ]* 5.4 Write property test for cancel edit behavior
  - **Property 10: Cancel edit behavior**
  - **Validates: Requirements 3.5**

- [ ] 6. Verify delete functionality with new UI
  - Test that clicking delete button on a payment method card calls `handleEliminarMetodo`
  - Verify that confirmation dialog appears (already implemented with `confirm()`)
  - Verify that DELETE request is sent only when user confirms
  - Verify that no request is sent when user cancels
  - Verify that list is updated after successful deletion
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ]* 6.1 Write property test for delete confirmation dialog
  - **Property 11: Delete confirmation dialog**
  - **Validates: Requirements 4.1**

- [ ]* 6.2 Write property test for delete request execution
  - **Property 12: Delete request execution**
  - **Validates: Requirements 4.2**

- [ ]* 6.3 Write property test for cancel delete behavior
  - **Property 13: Cancel delete behavior**
  - **Validates: Requirements 4.5**

- [ ] 7. Add responsive design adjustments
  - Add media queries to `ListaMetodosPago` for tablet (2 columns) and mobile (1 column)
  - Ensure form inputs stack properly on mobile devices
  - Test that all buttons and cards are properly sized and clickable on mobile
  - _Requirements: 5.1_

- [ ]* 7.1 Write unit tests for responsive layout
  - Test that grid columns adjust based on viewport width
  - Test that form inputs stack on mobile
  - _Requirements: 5.1_

- [ ] 8. Final integration testing and polish
  - Test complete create flow: open form → fill fields → submit → verify list update
  - Test complete edit flow: click edit → modify fields → submit → verify list update
  - Test complete delete flow: click delete → confirm → verify list update
  - Test cancel flows: verify cancel buttons reset state without API calls
  - Verify all toast notifications appear at appropriate times
  - Verify loading states and error states display correctly
  - Test with empty payment methods list
  - Test with multiple payment methods
  - _Requirements: All_

- [ ]* 8.1 Write integration tests for complete flows
  - Test create flow end-to-end
  - Test edit flow end-to-end
  - Test delete flow end-to-end
  - Test cancel flows
  - _Requirements: All_

- [ ] 9. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
