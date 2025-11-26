# Instrucciones para Importar Inventario desde Excel

## ✅ Sistema de Importación Masiva Creado

He creado un sistema completo para importar tu inventario desde Excel con más de mil productos.

## 📋 Preparación del Excel

### 1. Columnas Requeridas (nombres exactos):

| Columna | Obligatorio | Descripción |
|---------|-------------|-------------|
| **NUMERO DE PARTE** | ✅ Sí | Código único del producto |
| **DESCRIPCION** | ✅ Sí | Nombre/descripción del producto |
| **MARCA** | No | Nombre de la marca (se creará si no existe) |
| **CATEGORIA** | No | Nombre de la categoría (se creará si no existe) |
| **STOCK REAL** | No | Cantidad en inventario |
| **PRECIO COSTO PROMEDIO** | No | Costo en DÓLARES |
| **PRECIO VENTA PROMEDIO** | No | Precio de venta en DÓLARES |
| **PRECIO SUGERIDO** | No | Precio sugerido en DÓLARES |
| **PPCY** | No | Código sustituto 1 |
| **PPVU** | No | Código sustituto 2 |

### 2. Importante sobre los Precios:
- ⚠️ **TODOS LOS PRECIOS DEBEN ESTAR EN DÓLARES (US$)**
- El sistema automáticamente los convertirá a Córdobas usando el tipo de cambio actual
- Los precios se guardarán en ambas monedas

### 3. Preparar el Archivo:

**PASO 1:** Eliminar fórmulas
```
1. Selecciona todas las celdas con datos (Ctrl+A)
2. Copia (Ctrl+C)
3. Pega como Valores (Ctrl+Alt+V → Valores)
4. Guarda el archivo
```

**PASO 2:** Verificar columnas
- Asegúrate que los nombres de las columnas coincidan EXACTAMENTE
- Puedes usar mayúsculas o minúsculas (el sistema las reconoce)

**PASO 3:** Limpiar datos
- Elimina filas vacías
- Asegúrate que cada producto tenga al menos NUMERO DE PARTE y DESCRIPCION

## 🚀 Cómo Usar la Importación

### En la Vista de Inventario:

1. **Haz clic en el botón verde "Importar desde Excel"**
   - Está en la parte superior derecha de la vista de Inventario

2. **Selecciona tu archivo Excel**
   - Formatos aceptados: .xlsx, .xls

3. **Haz clic en "Importar"**
   - El sistema procesará todas las filas
   - Verás un mensaje con el resultado

### Qué hace el sistema:

✅ **Crea productos nuevos** si no existen (por número de parte)
✅ **Actualiza productos existentes** si ya están en la base de datos
✅ **Crea marcas automáticamente** si no existen
✅ **Crea categorías automáticamente** si no existen
✅ **Convierte precios** de dólares a córdobas automáticamente
✅ **Guarda códigos sustitutos** (PPCY y PPVU)
✅ **Maneja errores** y te muestra qué filas tuvieron problemas

## 📊 Ejemplo de Excel

```
NUMERO DE PARTE | DESCRIPCION              | MARCA       | CATEGORIA | STOCK REAL | PRECIO COSTO PROMEDIO | PRECIO VENTA PROMEDIO | PRECIO SUGERIDO | PPCY | PPVU
----------------|--------------------------|-------------|-----------|------------|-----------------------|-----------------------|-----------------|------|------
CUCH-001        | CUCHILLA DE 10"          | Desconocido | Mecanica  | 0          | 0.57                  | 1.18                  | 1.18            |      |
CUCH-002        | CUCHILLA FIJA CHAIN      | Desconocido | Mecanica  | 329        | 2.20                  | 5.25                  | 5.25            |      | 5.9
CUCH-003        | CUCHILLA MOVIL CHAIN     | Desconocido | Mecanica  | 319        | 2.20                  | 5.25                  | 5.25            | 5.5  | 5.9
```

## ⚠️ Notas Importantes

1. **Marcas y Categorías:**
   - Si pones "Desconocido" en MARCA, se creará una marca llamada "Desconocido"
   - Si dejas vacío, se usará "Desconocido" por defecto
   - Lo mismo aplica para categorías (por defecto: "General")

2. **Códigos Sustitutos:**
   - PPCY y PPVU son códigos de productos sustitutos
   - Pueden ser productos que aún no existen en el inventario
   - Se guardarán con marca "Desconocida" (ID 0)

3. **Productos Duplicados:**
   - Si un producto con el mismo NUMERO DE PARTE y MARCA ya existe, se ACTUALIZARÁ
   - No se crearán duplicados

4. **Errores:**
   - Si alguna fila tiene errores, se mostrará en consola
   - Las demás filas se procesarán normalmente
   - Revisa la consola del navegador (F12) para ver detalles de errores

## 🎯 Resultado Esperado

Después de importar verás un mensaje como:
```
✅ Importación exitosa!
Creados: 850
Actualizados: 150
Total procesado: 1000
```

Si hay errores:
```
⚠️ 5 filas con errores (ver consola)
```

## 🔧 Solución de Problemas

**Problema:** "No se recibió ningún archivo"
- Solución: Asegúrate de seleccionar un archivo .xlsx o .xls

**Problema:** "Falta número de parte o descripción"
- Solución: Verifica que todas las filas tengan estas columnas llenas

**Problema:** Precios incorrectos
- Solución: Asegúrate que los precios estén en DÓLARES, no en Córdobas

**Problema:** Muchos errores
- Solución: Revisa que los nombres de las columnas sean exactos

## 📞 Soporte

Si tienes problemas:
1. Revisa la consola del navegador (F12)
2. Verifica que el Excel tenga las columnas correctas
3. Asegúrate que los datos estén limpios (sin fórmulas)
