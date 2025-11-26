# Guía de Testing

Este documento describe cómo ejecutar y mantener los tests del proyecto.

## 📋 Estructura de Tests

### Backend (Jest + Supertest)
```
backend-ts-sqlite-jwt/
├── tests/
│   ├── setup.ts              # Configuración global
│   ├── auth.test.ts          # Tests de autenticación
│   ├── inventario.test.ts    # Tests de inventario
│   ├── movimientos.test.ts   # Tests de movimientos
│   ├── clientes.test.ts      # Tests de clientes
│   └── ventas.test.ts        # Tests de ventas
└── jest.config.js            # Configuración de Jest
```

### Frontend (Vitest + React Testing Library)
```
FrontEnd-React/Frontend/
├── src/tests/
│   ├── setup.ts              # Configuración global
│   ├── utils.test.ts         # Tests de utilidades
│   ├── components.test.tsx   # Tests de componentes
│   ├── api.test.ts           # Tests de API
│   └── business-logic.test.ts # Tests de lógica de negocio
└── vitest.config.ts          # Configuración de Vitest
```

## 🚀 Instalación de Dependencias

### Backend
```bash
cd backend-ts-sqlite-jwt
npm install
```

### Frontend
```bash
cd FrontEnd-React/Frontend
npm install
```

## ▶️ Ejecutar Tests

### Backend

**Ejecutar todos los tests:**
```bash
cd backend-ts-sqlite-jwt
npm test
```

**Ejecutar tests en modo watch:**
```bash
npm run test:watch
```

**Ver cobertura de código:**
```bash
npm test
# Los reportes se generan en: backend-ts-sqlite-jwt/coverage/
```

### Frontend

**Ejecutar todos los tests:**
```bash
cd FrontEnd-React/Frontend
npm test
```

**Ejecutar tests en modo watch:**
```bash
npm run test:watch
```

**Ejecutar tests con UI interactiva:**
```bash
npm run test:ui
```

**Ver cobertura de código:**
```bash
npm test
# Los reportes se generan en: FrontEnd-React/Frontend/coverage/
```

## 📊 Cobertura de Tests

### Backend
Los tests del backend cubren:
- ✅ Autenticación y JWT
- ✅ Gestión de inventario
- ✅ Movimientos de stock (Entrada, Salida, Armado, Desarmado)
- ✅ Gestión de clientes
- ✅ Ventas y facturación
- ✅ Cálculos de precios y conversión de moneda

### Frontend
Los tests del frontend cubren:
- ✅ Utilidades (formateo de fechas, moneda, números)
- ✅ Componentes React
- ✅ Llamadas a API
- ✅ Lógica de negocio
- ✅ Validaciones de formularios
- ✅ Filtrado y búsqueda de datos

## 🧪 Tipos de Tests

### Tests Unitarios
Prueban funciones y componentes individuales de forma aislada.

**Ejemplo:**
```typescript
it('should calculate stock correctly after entrada', () => {
  const stockActual = 10;
  const cantidad = 5;
  const nuevoStock = stockActual + cantidad;
  
  expect(nuevoStock).toBe(15);
});
```

### Tests de Integración
Prueban la interacción entre múltiples componentes o módulos.

**Ejemplo:**
```typescript
it('should process armado correctly', () => {
  // Simula el proceso completo de armado
  // con múltiples componentes y producto final
});
```

### Tests de API
Prueban las llamadas HTTP y manejo de respuestas.

**Ejemplo:**
```typescript
it('should make GET request successfully', async () => {
  const response = await fetch('/api/inventario');
  const data = await response.json();
  
  expect(response.ok).toBe(true);
  expect(data.items).toBeDefined();
});
```

## 📝 Escribir Nuevos Tests

### Backend (Jest)
```typescript
describe('Nombre del Módulo', () => {
  describe('Funcionalidad Específica', () => {
    it('should do something', () => {
      // Arrange: Preparar datos
      const input = 'test';
      
      // Act: Ejecutar función
      const result = myFunction(input);
      
      // Assert: Verificar resultado
      expect(result).toBe('expected');
    });
  });
});
```

### Frontend (Vitest)
```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('Component Name', () => {
  it('should render correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

## 🔧 Configuración

### Variables de Entorno para Tests
Los tests usan configuraciones específicas definidas en `setup.ts`:
- JWT_SECRET: 'test-secret-key'
- DATABASE_URL: 'file:./test.db'

### Mocks
Los tests utilizan mocks para:
- Base de datos (Prisma)
- Fetch API
- LocalStorage
- Cookies
- Window.matchMedia

## 📈 Mejores Prácticas

1. **Nombrar tests descriptivamente**: Usa nombres que expliquen qué se está probando
2. **Un concepto por test**: Cada test debe verificar una sola cosa
3. **Arrange-Act-Assert**: Organiza el código del test en estas tres secciones
4. **Tests independientes**: Los tests no deben depender unos de otros
5. **Limpiar después**: Usa `afterEach` para limpiar el estado
6. **Cobertura mínima**: Apunta a >80% de cobertura de código

## 🐛 Debugging Tests

### Backend
```bash
# Ejecutar un test específico
npm test -- auth.test.ts

# Ejecutar con más detalle
npm test -- --verbose
```

### Frontend
```bash
# Ejecutar un test específico
npm test -- utils.test.ts

# Ejecutar con UI para debugging
npm run test:ui
```

## 📚 Recursos

- [Jest Documentation](https://jestjs.io/)
- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Supertest Documentation](https://github.com/visionmedia/supertest)

## 🎯 Próximos Pasos

Para mejorar la cobertura de tests:
1. Agregar tests E2E con Playwright o Cypress
2. Agregar tests de performance
3. Implementar tests de accesibilidad
4. Configurar CI/CD para ejecutar tests automáticamente
5. Agregar tests de seguridad

## 💡 Comandos Útiles

```bash
# Backend
cd backend-ts-sqlite-jwt
npm test                    # Ejecutar todos los tests
npm run test:watch          # Modo watch
npm test -- --coverage      # Con cobertura

# Frontend
cd FrontEnd-React/Frontend
npm test                    # Ejecutar todos los tests
npm run test:watch          # Modo watch
npm run test:ui             # UI interactiva
npm test -- --coverage      # Con cobertura

# Ejecutar tests de todo el proyecto
npm test --workspaces       # Desde la raíz del proyecto
```
