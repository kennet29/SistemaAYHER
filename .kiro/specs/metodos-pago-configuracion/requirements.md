# Requirements Document

## Introduction

Este documento define los requisitos para agregar la gestión de métodos de pago a la vista de configuración existente. El backend ya tiene implementada toda la funcionalidad necesaria (modelo MetodoPago, controlador, rutas API), y el frontend tiene el código lógico preparado pero sin interfaz visual. El objetivo es completar la interfaz de usuario para permitir a los usuarios crear, editar, listar y eliminar métodos de pago desde la vista de configuración.

## Glossary

- **Sistema**: La aplicación web AYHER que gestiona configuración empresarial
- **Usuario**: Persona autenticada que accede a la vista de configuración
- **Método de Pago**: Registro que contiene información bancaria o de pago (nombre, banco, número de cuenta, titular, moneda)
- **Vista de Configuración**: Componente React ubicado en `FrontEnd-React/Frontend/src/Views/Configuracion.tsx`
- **API de Métodos de Pago**: Endpoint REST en `/api/metodos-pago` que maneja operaciones CRUD

## Requirements

### Requirement 1

**User Story:** Como usuario administrador, quiero ver una lista de todos los métodos de pago registrados en la vista de configuración, para poder conocer qué opciones de pago están disponibles en el sistema.

#### Acceptance Criteria

1. WHEN el usuario accede a la vista de configuración THEN el sistema SHALL mostrar una sección titulada "Métodos de Pago" debajo de la sección de datos generales
2. WHEN el sistema carga los métodos de pago THEN el sistema SHALL mostrar cada método en una tarjeta o fila con su nombre, banco, número de cuenta, titular y moneda
3. WHEN no existen métodos de pago registrados THEN el sistema SHALL mostrar un mensaje indicando "No hay métodos de pago registrados"
4. WHEN el sistema carga los métodos de pago THEN el sistema SHALL ordenarlos por estado activo primero y luego alfabéticamente por nombre
5. WHEN ocurre un error al cargar los métodos de pago THEN el sistema SHALL mostrar una notificación de error al usuario

### Requirement 2

**User Story:** Como usuario administrador, quiero agregar nuevos métodos de pago desde la vista de configuración, para poder registrar las cuentas bancarias y opciones de pago de la empresa.

#### Acceptance Criteria

1. WHEN el usuario hace clic en el botón "Agregar Método de Pago" THEN el sistema SHALL mostrar un formulario con campos para nombre, banco, número de cuenta, titular y moneda
2. WHEN el usuario completa el formulario y hace clic en guardar THEN el sistema SHALL validar que los campos nombre, banco, número de cuenta y titular no estén vacíos
3. WHEN la validación es exitosa THEN el sistema SHALL enviar una petición POST al endpoint `/api/metodos-pago` con los datos del formulario
4. WHEN el servidor responde exitosamente THEN el sistema SHALL mostrar una notificación de éxito, limpiar el formulario y actualizar la lista de métodos de pago
5. WHEN el servidor responde con error THEN el sistema SHALL mostrar una notificación de error al usuario
6. WHEN el usuario no completa todos los campos obligatorios THEN el sistema SHALL mostrar una advertencia indicando que debe completar todos los campos

### Requirement 3

**User Story:** Como usuario administrador, quiero editar métodos de pago existentes desde la vista de configuración, para poder actualizar información bancaria cuando sea necesario.

#### Acceptance Criteria

1. WHEN el usuario hace clic en el botón de editar de un método de pago THEN el sistema SHALL cargar los datos del método en el formulario de edición
2. WHEN el formulario está en modo edición THEN el sistema SHALL mostrar un indicador visual de que se está editando un método existente
3. WHEN el usuario modifica los datos y hace clic en guardar THEN el sistema SHALL enviar una petición PUT al endpoint `/api/metodos-pago/:id` con los datos actualizados
4. WHEN el servidor responde exitosamente THEN el sistema SHALL mostrar una notificación de éxito, limpiar el formulario y actualizar la lista de métodos de pago
5. WHEN el usuario hace clic en cancelar durante la edición THEN el sistema SHALL limpiar el formulario y salir del modo edición

### Requirement 4

**User Story:** Como usuario administrador, quiero eliminar métodos de pago desde la vista de configuración, para poder remover opciones de pago que ya no están en uso.

#### Acceptance Criteria

1. WHEN el usuario hace clic en el botón de eliminar de un método de pago THEN el sistema SHALL mostrar un diálogo de confirmación preguntando si desea eliminar el método
2. WHEN el usuario confirma la eliminación THEN el sistema SHALL enviar una petición DELETE al endpoint `/api/metodos-pago/:id`
3. WHEN el servidor responde exitosamente THEN el sistema SHALL mostrar una notificación de éxito y actualizar la lista de métodos de pago
4. WHEN el servidor responde con error THEN el sistema SHALL mostrar una notificación de error al usuario
5. WHEN el usuario cancela la eliminación THEN el sistema SHALL cerrar el diálogo sin realizar cambios

### Requirement 5

**User Story:** Como usuario administrador, quiero que la interfaz de métodos de pago sea consistente con el diseño existente de la vista de configuración, para mantener una experiencia visual coherente.

#### Acceptance Criteria

1. WHEN el sistema renderiza la sección de métodos de pago THEN el sistema SHALL utilizar los mismos estilos y componentes styled-components que el resto de la vista
2. WHEN el sistema muestra el formulario de métodos de pago THEN el sistema SHALL aplicar el mismo estilo de inputs con borde oscuro (#5a6d90) que los campos de datos generales
3. WHEN el sistema muestra botones de acción THEN el sistema SHALL utilizar el gradiente azul-rojo (#004aad a #ff3131) consistente con el diseño existente
4. WHEN el sistema muestra las tarjetas de métodos de pago THEN el sistema SHALL aplicar sombras, bordes redondeados y efectos hover similares al resto de la interfaz
5. WHEN el usuario interactúa con los elementos THEN el sistema SHALL aplicar las mismas transiciones y animaciones que el resto de la vista

### Requirement 6

**User Story:** Como usuario administrador, quiero que el campo de moneda tenga opciones predefinidas, para asegurar consistencia en los datos de métodos de pago.

#### Acceptance Criteria

1. WHEN el sistema muestra el formulario de método de pago THEN el sistema SHALL mostrar un campo select para moneda con las opciones "NIO" y "USD"
2. WHEN el usuario crea un nuevo método de pago THEN el sistema SHALL establecer "NIO" como valor predeterminado para el campo moneda
3. WHEN el usuario edita un método de pago existente THEN el sistema SHALL mostrar la moneda actual del método seleccionada en el campo select
4. WHEN el usuario guarda el formulario THEN el sistema SHALL incluir el valor de moneda seleccionado en la petición al servidor
