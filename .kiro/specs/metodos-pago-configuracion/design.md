# Design Document

## Overview

Este diseño describe la implementación de la interfaz de usuario para gestionar métodos de pago dentro de la vista de configuración existente. El backend ya está completamente implementado con el modelo `MetodoPago`, controlador y rutas API. El frontend tiene la lógica de estado y funciones preparadas pero falta la interfaz visual. 

La solución consiste en agregar una nueva sección en el componente `Configuracion.tsx` que incluya:
- Una lista visual de métodos de pago existentes
- Un formulario para crear/editar métodos de pago
- Botones de acción para editar y eliminar
- Integración con el estado y funciones ya existentes en el componente

## Architecture

### Component Structure

```
ConfiguracionView (existing)
├── AnimatedBackground
├── BackButton
├── Header
├── FormContainer (Datos Generales) - existing
├── MetodosPagoSection (NEW)
│   ├── SectionTitle
│   ├── FormularioMetodoPago (NEW)
│   │   ├── Input fields (nombre, banco, numeroCuenta, titular)
│   │   ├── Select field (moneda)
│   │   └── Action buttons (Guardar/Cancelar)
│   └── ListaMetodosPago (NEW)
│       └── MetodoPagoCard[] (NEW)
│           ├── Display fields
│           └── Action buttons (Editar/Eliminar)
└── Footer
```

### Data Flow

1. **Initial Load**: `useEffect` → `fetchMetodosPago()` → GET `/api/metodos-pago` → `setMetodosPago()`
2. **Create**: Form submit → `handleGuardarMetodo()` → POST `/api/metodos-pago` → `fetchMetodosPago()`
3. **Update**: Edit button → `handleEditarMetodo()` → populate form → Form submit → PUT `/api/metodos-pago/:id` → `fetchMetodosPago()`
4. **Delete**: Delete button → confirm → `handleEliminarMetodo()` → DELETE `/api/metodos-pago/:id` → `fetchMetodosPago()`

## Components and Interfaces

### Existing State (Already Implemented)

```typescript
// Estado para métodos de pago
const [metodosPago, setMetodosPago] = useState<any[]>([]);
const [editandoMetodo, setEditandoMetodo] = useState<number | null>(null);
const [formMetodo, setFormMetodo] = useState({
  nombre: "",
  banco: "",
  numeroCuenta: "",
  titular: "",
  moneda: "NIO",
});
```

### Existing Functions (Already Implemented)

```typescript
// Todas estas funciones ya existen en el código:
- fetchMetodosPago(): Promise<void>
- handleGuardarMetodo(e: React.FormEvent): Promise<void>
- handleEditarMetodo(metodo: any): void
- handleEliminarMetodo(id: number): Promise<void>
```

### New UI Components to Add

#### 1. MetodosPagoSection (Styled Component)
Container for the entire payment methods section, positioned after the general data form.

```typescript
const MetodosPagoSection = styled.div`
  width: 85%;
  max-width: 950px;
  margin-top: 2%;
  padding: 2.5%;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border-radius: 1em;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
`;
```

#### 2. FormularioMetodoPago (JSX Structure)
Form for creating/editing payment methods using existing `formMetodo` state and `handleGuardarMetodo` function.

Fields:
- `nombre` (text input, required)
- `banco` (text input, required)
- `numeroCuenta` (text input, required)
- `titular` (text input, required)
- `moneda` (select: NIO/USD, default: NIO)

Buttons:
- Save button (calls `handleGuardarMetodo`)
- Cancel button (visible only when editing, clears form and `editandoMetodo`)

#### 3. ListaMetodosPago (Styled Component)
Grid container for displaying payment method cards.

```typescript
const ListaMetodosPago = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5em;
  margin-top: 1.5em;
`;
```

#### 4. MetodoPagoCard (Styled Component)
Individual card displaying payment method information with edit/delete buttons.

Display fields:
- `nombre` (bold, larger font)
- `banco`
- `numeroCuenta` (masked or full)
- `titular`
- `moneda` (badge style)

Action buttons:
- Edit button (calls `handleEditarMetodo`)
- Delete button (calls `handleEliminarMetodo`)

#### 5. EmptyState (Styled Component)
Message displayed when `metodosPago.length === 0`.

## Data Models

### MetodoPago Interface (Backend Model)

```typescript
interface MetodoPago {
  id: number;
  nombre: string;
  tipoCuenta: string;      // Always "BANCO" from frontend
  banco: string | null;
  numeroCuenta: string | null;
  titular: string | null;
  moneda: string;          // "NIO" | "USD"
  activo: boolean;
  observaciones: string | null;
  createdAt: Date;
  updatedAt: Date;
}
```

### FormMetodo State (Frontend)

```typescript
interface FormMetodo {
  nombre: string;
  banco: string;
  numeroCuenta: string;
  titular: string;
  moneda: "NIO" | "USD";
}
```

## Corre
ctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

After reviewing the prework analysis, several properties were identified as redundant or overlapping. The following consolidated properties provide comprehensive validation coverage:

Property 1: Payment method display completeness
*For any* payment method in the list, the rendered card should display all required fields: nombre, banco, numeroCuenta, titular, and moneda
**Validates: Requirements 1.2**

Property 2: Payment method list ordering
*For any* list of payment methods with varying active states and names, the displayed order should have active methods first, then sorted alphabetically by name
**Validates: Requirements 1.4**

Property 3: Required field validation
*For any* form submission attempt, if any required field (nombre, banco, numeroCuenta, titular) is empty, the system should prevent submission and show a warning
**Validates: Requirements 2.2, 2.6**

Property 4: Create request data integrity
*For any* valid form data submitted for creation, the POST request to `/api/metodos-pago` should include all form fields with tipoCuenta set to "BANCO" and activo set to true
**Validates: Requirements 2.3**

Property 5: Successful operation feedback
*For any* successful API response (create, update, or delete), the system should show a success notification, refresh the payment methods list, and clear the form (if applicable)
**Validates: Requirements 2.4, 3.4, 4.3**

Property 6: Error response handling
*For any* error response from the API, the system should display an error notification to the user
**Validates: Requirements 2.5, 4.4**

Property 7: Edit mode form population
*For any* payment method, clicking the edit button should populate the form with that method's data (nombre, banco, numeroCuenta, titular, moneda) and set editandoMetodo to the method's id
**Validates: Requirements 3.1**

Property 8: Edit mode visual indicator
*For any* payment method being edited (editandoMetodo !== null), the form should display a visual indicator showing edit mode
**Validates: Requirements 3.2**

Property 9: Update request data integrity
*For any* valid form data submitted for update, the PUT request to `/api/metodos-pago/:id` should include all form fields with the correct id
**Validates: Requirements 3.3**

Property 10: Cancel edit behavior
*For any* edit session, clicking cancel should clear the form, set editandoMetodo to null, and exit edit mode
**Validates: Requirements 3.5**

Property 11: Delete confirmation dialog
*For any* payment method, clicking the delete button should trigger a confirmation dialog before proceeding
**Validates: Requirements 4.1**

Property 12: Delete request execution
*For any* payment method where deletion is confirmed, a DELETE request should be sent to `/api/metodos-pago/:id` with the correct id
**Validates: Requirements 4.2**

Property 13: Cancel delete behavior
*For any* delete cancellation, no DELETE request should be sent and the payment methods list should remain unchanged
**Validates: Requirements 4.5**

Property 14: Default currency value
*For any* new payment method form (not in edit mode), the moneda field should default to "NIO"
**Validates: Requirements 6.2**

Property 15: Edit currency preservation
*For any* payment method being edited, the moneda select field should show the method's current currency value as selected
**Validates: Requirements 6.3**

Property 16: Currency inclusion in requests
*For any* form submission (create or update), the selected moneda value should be included in the API request payload
**Validates: Requirements 6.4**

## Error Handling

### API Error Handling

All API calls already implement try-catch blocks with toast notifications:

```typescript
try {
  // API call
  const res = await fetch(url, options);
  if (!res.ok) throw new Error("Error message");
  // Success handling
  toast.success("Success message");
} catch {
  toast.error("Error message");
}
```

### Validation Errors

Form validation occurs before API calls:

```typescript
if (!formMetodo.nombre || !formMetodo.banco || !formMetodo.numeroCuenta || !formMetodo.titular) {
  toast.warn("⚠️ Complete todos los campos obligatorios");
  return;
}
```

### Network Errors

Network failures are caught by the catch block and display error toasts to the user.

### Empty State Handling

When `metodosPago.length === 0`, display an empty state message instead of an empty grid.

## Testing Strategy

### Unit Testing

Unit tests will verify specific UI behaviors and edge cases:

1. **Empty State Rendering**: Verify that when `metodosPago` is an empty array, the empty state message is displayed
2. **Form Field Presence**: Verify that the form contains all required input fields (nombre, banco, numeroCuenta, titular, moneda)
3. **Currency Select Options**: Verify that the moneda select field contains exactly two options: "NIO" and "USD"
4. **Button Click Handlers**: Verify that clicking edit/delete buttons calls the correct handler functions
5. **Confirmation Dialog**: Verify that delete action triggers a confirmation dialog

### Property-Based Testing

Property-based tests will verify universal behaviors across all inputs using **fast-check** (JavaScript property testing library):

Each property test should run a minimum of 100 iterations to ensure thorough coverage.

**Property Test 1: Payment method display completeness**
- Generate random payment methods with all required fields
- Render the component with these methods
- Verify each rendered card contains all fields (nombre, banco, numeroCuenta, titular, moneda)
- **Feature: metodos-pago-configuracion, Property 1: Payment method display completeness**

**Property Test 2: Payment method list ordering**
- Generate random lists of payment methods with varying active states and names
- Render the component
- Verify the displayed order matches: active first, then alphabetical by name
- **Feature: metodos-pago-configuracion, Property 2: Payment method list ordering**

**Property Test 3: Required field validation**
- Generate random form data with at least one required field empty
- Attempt form submission
- Verify submission is prevented and warning is shown
- **Feature: metodos-pago-configuracion, Property 3: Required field validation**

**Property Test 4: Create request data integrity**
- Generate random valid form data
- Submit for creation
- Verify POST request includes all fields with tipoCuenta="BANCO" and activo=true
- **Feature: metodos-pago-configuracion, Property 4: Create request data integrity**

**Property Test 5: Successful operation feedback**
- Generate random successful API responses for create/update/delete
- Verify success notification, list refresh, and form clear occur
- **Feature: metodos-pago-configuracion, Property 5: Successful operation feedback**

**Property Test 6: Error response handling**
- Generate random error responses from API
- Verify error notification is displayed
- **Feature: metodos-pago-configuracion, Property 6: Error response handling**

**Property Test 7: Edit mode form population**
- Generate random payment methods
- Click edit on each
- Verify form is populated with correct data and editandoMetodo is set
- **Feature: metodos-pago-configuracion, Property 7: Edit mode form population**

**Property Test 8: Edit mode visual indicator**
- Set editandoMetodo to any non-null value
- Verify visual indicator is present in the form
- **Feature: metodos-pago-configuracion, Property 8: Edit mode visual indicator**

**Property Test 9: Update request data integrity**
- Generate random valid form data with an id
- Submit for update
- Verify PUT request includes all fields with correct id
- **Feature: metodos-pago-configuracion, Property 9: Update request data integrity**

**Property Test 10: Cancel edit behavior**
- Set form to edit mode with any payment method
- Click cancel
- Verify form is cleared and editandoMetodo is null
- **Feature: metodos-pago-configuracion, Property 10: Cancel edit behavior**

**Property Test 11: Delete confirmation dialog**
- Generate random payment methods
- Click delete on each
- Verify confirmation dialog appears
- **Feature: metodos-pago-configuracion, Property 11: Delete confirmation dialog**

**Property Test 12: Delete request execution**
- Generate random payment methods
- Confirm deletion
- Verify DELETE request is sent with correct id
- **Feature: metodos-pago-configuracion, Property 12: Delete request execution**

**Property Test 13: Cancel delete behavior**
- Initiate delete for any payment method
- Cancel the deletion
- Verify no DELETE request is sent and list is unchanged
- **Feature: metodos-pago-configuracion, Property 13: Cancel delete behavior**

**Property Test 14: Default currency value**
- Render form in create mode (not editing)
- Verify moneda field defaults to "NIO"
- **Feature: metodos-pago-configuracion, Property 14: Default currency value**

**Property Test 15: Edit currency preservation**
- Generate random payment methods with different currencies
- Edit each method
- Verify moneda select shows the method's current currency
- **Feature: metodos-pago-configuracion, Property 15: Edit currency preservation**

**Property Test 16: Currency inclusion in requests**
- Generate random form submissions with different currency values
- Verify selected moneda is included in API request payload
- **Feature: metodos-pago-configuracion, Property 16: Currency inclusion in requests**

### Integration Testing

Integration tests will verify the complete flow:

1. **Create Flow**: Load page → Fill form → Submit → Verify API call → Verify list update
2. **Edit Flow**: Load page → Click edit → Modify form → Submit → Verify API call → Verify list update
3. **Delete Flow**: Load page → Click delete → Confirm → Verify API call → Verify list update
4. **Cancel Flows**: Verify cancel buttons properly reset state without API calls

### Testing Tools

- **Testing Library**: React Testing Library for component testing
- **Property Testing**: fast-check for property-based tests
- **Mocking**: Mock Service Worker (MSW) for API mocking
- **Assertions**: Jest matchers for assertions

## Implementation Notes

### Styling Consistency

All new styled components should follow the existing patterns:
- Use `styled-components` library
- Apply the same color palette: `#004aad`, `#ff3131`, `#001a33`, `#5a6d90`
- Use consistent border radius: `0.6em` to `1em`
- Apply box shadows: `0 8px 25px rgba(0, 0, 0, 0.15)`
- Use the same transitions: `all 0.3s ease`

### Responsive Design

The payment methods section should be responsive:
- Desktop: Grid with multiple columns (auto-fill, minmax(300px, 1fr))
- Tablet: 2 columns
- Mobile: Single column

### Accessibility

- All form inputs should have proper labels
- Buttons should have descriptive text or aria-labels
- Error messages should be announced to screen readers
- Focus management for form interactions

### Performance Considerations

- The `fetchMetodosPago` function is already optimized to only fetch when needed
- No additional optimization required for the initial implementation
- Consider pagination if the number of payment methods grows significantly (future enhancement)
