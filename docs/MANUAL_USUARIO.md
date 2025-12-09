# 📖 Manual de Usuario - EcoEstudiante

<div align="center">

![EcoEstudiante Logo](https://via.placeholder.com/200x80/4CAF50/FFFFFF?text=EcoEstudiante)

**Guía completa para usuarios de la plataforma EcoEstudiante**

[Introducción](#-introducción) • [Inicio Rápido](#-inicio-rápido) • [Funcionalidades](#-funcionalidades-principales) • [Panel Admin](#-panel-de-administración) • [FAQ](#-preguntas-frecuentes)

</div>

---

## 📋 Tabla de Contenidos

1. [Introducción](#-introducción)
2. [Requisitos Previos](#-requisitos-previos)
3. [Inicio Rápido](#-inicio-rápido)
4. [Funcionalidades Principales](#-funcionalidades-principales)
   - [Registro e Inicio de Sesión](#registro-e-inicio-de-sesión)
   - [Dashboard Principal](#dashboard-principal)
   - [Cálculo de Huella de Carbono](#cálculo-de-huella-de-carbono)
   - [Sistema de Gamificación](#sistema-de-gamificación)
   - [Estadísticas y Reportes](#estadísticas-y-reportes)
5. [Panel de Administración](#-panel-de-administración)
6. [Solución de Problemas](#-solución-de-problemas)
7. [Preguntas Frecuentes](#-preguntas-frecuentes)

---

## 🎯 Introducción

**EcoEstudiante** es una plataforma web educativa diseñada para que estudiantes universitarios calculen, registren y reduzcan su huella de carbono personal. Este manual te guiará paso a paso para utilizar todas las funcionalidades de la plataforma.

### ¿Qué puedes hacer con EcoEstudiante?

- 🧮 **Calcular tu huella de carbono** en electricidad, transporte y residuos
- 📊 **Visualizar tus estadísticas** y tendencias de emisiones
- 🎮 **Participar en misiones** y ganar puntos de experiencia (XP)
- 🏆 **Competir en tablas de clasificación** con otros estudiantes
- 📈 **Seguir tu progreso** hacia un estilo de vida más sostenible

---

## ✅ Requisitos Previos

Para utilizar EcoEstudiante necesitas:

- **Navegador web moderno**: Chrome, Firefox, Safari o Edge (últimas versiones)
- **Conexión a Internet**: Para acceder a la plataforma
- **Cuenta de usuario**: Registro en la plataforma o credenciales proporcionadas
- **Datos básicos**: Información sobre tu consumo de electricidad, transporte y residuos

### Navegadores Compatibles

| Navegador | Versión Mínima | Estado |
|-----------|----------------|--------|
| Google Chrome | 90+ | ✅ Recomendado |
| Mozilla Firefox | 88+ | ✅ Compatible |
| Safari | 14+ | ✅ Compatible |
| Microsoft Edge | 90+ | ✅ Compatible |

---

## 🚀 Inicio Rápido

### Paso 1: Acceder a la Plataforma

1. Abre tu navegador web
2. Navega a: `http://localhost:3000` (desarrollo) o la URL de producción
3. Verás la página de inicio de EcoEstudiante

### Paso 2: Registro o Inicio de Sesión

**Opción A: Registro Nuevo**
1. Haz clic en el botón **"Registrarse"** o **"Crear Cuenta"**
2. Completa el formulario con:
   - Nombre completo
   - Email institucional
   - Contraseña segura
   - Confirmación de contraseña
3. Haz clic en **"Registrarse"**
4. Verifica tu email si es requerido

**Opción B: Inicio de Sesión**
1. Haz clic en **"Iniciar Sesión"**
2. Ingresa tu email y contraseña
3. Haz clic en **"Iniciar Sesión"**

**Opción C: Inicio con Auth0/Google**
1. Haz clic en **"Iniciar con Google"** o **"Iniciar con Auth0"**
2. Autoriza el acceso a tu cuenta
3. Serás redirigido automáticamente

### Paso 3: Explorar el Dashboard

Una vez iniciada la sesión, serás redirigido al **Dashboard Principal** donde podrás:
- Ver tu resumen de huella de carbono
- Acceder a todas las funcionalidades
- Ver tus misiones activas
- Consultar tu posición en la tabla de clasificación

---

## 🎯 Funcionalidades Principales

### Registro e Inicio de Sesión

#### Registro de Nueva Cuenta

**Pasos detallados:**

1. **Acceder a la página de registro**
   - Desde la página principal, haz clic en **"Registrarse"**
   - O navega directamente a `/register`

2. **Completar el formulario**
   - **Nombre completo**: Tu nombre y apellidos
   - **Email**: Tu correo institucional (ej: nombre@universidad.cl)
   - **Contraseña**: Mínimo 8 caracteres, con mayúsculas, minúsculas y números
   - **Confirmar contraseña**: Vuelve a ingresar tu contraseña

3. **Aceptar términos y condiciones**
   - Lee los términos de uso
   - Marca la casilla de aceptación

4. **Completar registro**
   - Haz clic en **"Crear Cuenta"**
   - Recibirás un mensaje de confirmación

#### Inicio de Sesión

**Pasos detallados:**

1. **Acceder a la página de login**
   - Desde la página principal, haz clic en **"Iniciar Sesión"**
   - O navega a `/login`

2. **Ingresar credenciales**
   - **Email**: El email con el que te registraste
   - **Contraseña**: Tu contraseña

3. **Iniciar sesión**
   - Haz clic en **"Iniciar Sesión"**
   - Serás redirigido al dashboard

**Recordar sesión:**
- Marca la casilla **"Recordarme"** para mantener la sesión activa

### Dashboard Principal

El dashboard es tu centro de control. Aquí encontrarás:

#### Sección de Resumen
- **Huella de carbono actual**: Total de emisiones del mes actual
- **Comparación con el mes anterior**: Porcentaje de cambio
- **Gráfico de tendencias**: Visualización de tu progreso histórico

#### Navegación Principal
- **Cálculos**: Acceso rápido a calcular huella de carbono
- **Misiones**: Ver y gestionar tus misiones activas
- **Estadísticas**: Gráficos y análisis detallados
- **Perfil**: Configuración de tu cuenta

#### Misiones Activas
- Lista de misiones en progreso
- Progreso actual de cada misión
- Tiempo restante para completar

#### Tabla de Clasificación
- Tu posición actual
- Top 10 estudiantes
- Filtros por categoría (XP, Reducción, Misiones)

### Cálculo de Huella de Carbono

#### Cálculo de Electricidad

**Pasos para calcular:**

1. **Acceder al formulario**
   - Desde el dashboard, haz clic en **"Calcular Electricidad"**
   - O navega a la sección de cálculos

2. **Ingresar datos**
   - **Consumo mensual (kWh)**: Tu consumo del mes
   - **Mes**: Selecciona el mes del cálculo
   - **Año**: Selecciona el año

3. **Calcular**
   - Haz clic en **"Calcular Huella"**
   - Verás el resultado en kg CO₂e

4. **Guardar cálculo**
   - Revisa el resultado
   - Haz clic en **"Guardar"** para registrar el cálculo
   - Ganarás XP por registrar el cálculo

**Ejemplo:**
- Consumo: 150 kWh
- Factor de emisión: 0.4 kg CO₂e/kWh (Chile)
- Resultado: 60 kg CO₂e

#### Cálculo de Transporte

**Pasos para calcular:**

1. **Seleccionar modo de transporte**
   - Auto (gasolina, diesel, eléctrico, híbrido)
   - Moto
   - Transporte público (bus, metro)
   - Bicicleta o caminar
   - Avión

2. **Ingresar distancia**
   - **Distancia (km)**: Kilómetros recorridos
   - **Frecuencia**: Diaria, semanal, mensual

3. **Opcional: Ruta en mapa**
   - Haz clic en **"Seleccionar en mapa"**
   - Marca origen y destino
   - La distancia se calculará automáticamente

4. **Calcular y guardar**
   - Haz clic en **"Calcular"**
   - Revisa el resultado
   - Guarda el cálculo

**Factores de emisión:**
- Caminar/Bicicleta: 0 kg CO₂e
- Metro: 0.014 kg CO₂e/km
- Bus: 0.089 kg CO₂e/km
- Auto gasolina: 0.120 kg CO₂e/km
- Auto eléctrico: 0.050 kg CO₂e/km

#### Cálculo de Residuos

**Pasos para calcular:**

1. **Seleccionar tipo de residuo**
   - Orgánico
   - Reciclable (papel, plástico, vidrio, metal)
   - No reciclable

2. **Ingresar cantidad**
   - **Peso (kg)**: Cantidad de residuos
   - **Período**: Semanal o mensual

3. **Método de disposición**
   - Relleno sanitario
   - Compostaje
   - Reciclaje

4. **Calcular y guardar**
   - Haz clic en **"Calcular"**
   - Revisa el resultado
   - Guarda el cálculo

### Sistema de Gamificación

#### Sistema de XP (Experiencia)

**Cómo ganar XP:**

- ✅ **Registrar un cálculo**: +10 XP
- ✅ **Completar una misión**: +50 XP
- ✅ **Racha de 7 días**: +25 XP
- ✅ **Reducir emisiones 10%**: +30 XP
- ✅ **Completar perfil**: +15 XP

**Ver tu balance de XP:**
1. Ve a tu perfil de gamificación
2. Verás tu balance actual
3. Historial de transacciones de XP

#### Misiones

**Tipos de misiones:**

1. **Misiones de Reducción**
   - Reducir emisiones de electricidad en X%
   - Reducir emisiones de transporte en X%
   - Objetivo: Reducir emisiones totales

2. **Misiones de Consistencia**
   - Registrar cálculos 7 días consecutivos
   - Completar perfil al 100%
   - Participar en todas las categorías

3. **Misiones Especiales**
   - Logros únicos
   - Eventos temporales
   - Desafíos institucionales

**Gestionar misiones:**

1. **Ver misiones disponibles**
   - Desde el dashboard, haz clic en **"Misiones"**
   - Verás misiones que puedes iniciar

2. **Iniciar una misión**
   - Selecciona una misión disponible
   - Haz clic en **"Iniciar Misión"**
   - La misión aparecerá en "Misiones Activas"

3. **Ver progreso**
   - En "Misiones Activas" verás:
     - Progreso actual
     - Objetivo a alcanzar
     - Tiempo restante
     - Porcentaje completado

4. **Completar misión**
   - Al alcanzar el objetivo, la misión se completa automáticamente
   - Recibirás XP y logros
   - La misión aparecerá en "Misiones Completadas"

#### Tabla de Clasificación

**Acceder a la tabla:**
1. Desde el dashboard, haz clic en **"Clasificación"**
2. O navega a la sección de gamificación

**Categorías:**
- **Por XP Total**: Ranking general
- **Por Reducción**: Mayor reducción de emisiones
- **Por Misiones**: Más misiones completadas

**Tu posición:**
- Verás tu posición actual
- Comparación con estudiantes cercanos
- Progreso hacia el siguiente puesto

### Estadísticas y Reportes

#### Ver Estadísticas Personales

1. **Acceder a estadísticas**
   - Desde el dashboard, haz clic en **"Estadísticas"**
   - O navega a la sección correspondiente

2. **Gráficos disponibles**
   - **Tendencia mensual**: Evolución de tus emisiones
   - **Distribución por categoría**: Electricidad, Transporte, Residuos
   - **Comparación anual**: Año actual vs año anterior
   - **Proyección**: Estimación de emisiones futuras

3. **Filtros**
   - Selecciona período (mes, trimestre, año)
   - Filtra por categoría
   - Compara con promedios

#### Exportar Reportes

1. **Generar reporte**
   - En la sección de estadísticas
   - Haz clic en **"Exportar Reporte"**

2. **Formato**
   - Selecciona formato: PDF o CSV
   - Define el período
   - Haz clic en **"Generar"**

3. **Descargar**
   - El reporte se generará
   - Descarga automática o enlace de descarga

---

## 👨‍💼 Panel de Administración

### Acceso al Panel

**Requisitos:**
- Tener rol de **Administrador (ADMIN)**
- Credenciales de administrador

**Pasos para acceder:**
1. Navega a `/admin/login`
2. Ingresa tus credenciales de administrador
3. Serás redirigido al panel de administración

### Funcionalidades del Panel

#### Gestión de Usuarios

**Ver lista de usuarios:**
1. En el menú lateral, haz clic en **"Usuarios"**
2. Verás una tabla con todos los usuarios
3. Puedes buscar, filtrar y ordenar

**Crear nuevo usuario:**
1. Haz clic en **"Nuevo Usuario"**
2. Completa el formulario:
   - Nombre completo
   - Email
   - Contraseña
   - Rol (STUDENT o ADMIN)
3. Haz clic en **"Crear"**

**Editar usuario:**
1. En la lista de usuarios, haz clic en el usuario
2. Haz clic en **"Editar"**
3. Modifica los campos necesarios
4. Haz clic en **"Guardar"**

**Eliminar usuario:**
1. Selecciona el usuario
2. Haz clic en **"Eliminar"**
3. Confirma la acción

#### Analytics Institucional

**Ver métricas agregadas:**
1. En el menú, haz clic en **"Analytics"**
2. Verás:
   - Total de estudiantes registrados
   - Total de cálculos realizados
   - Emisiones totales calculadas
   - Reducción promedio
   - Misiones completadas

**Generar reportes:**
1. En Analytics, haz clic en **"Generar Reporte"**
2. Selecciona:
   - Formato (CSV o PDF)
   - Período
   - Tipo de datos
3. Haz clic en **"Generar"**
4. El reporte se guardará en S3 y podrás descargarlo

#### Gestión de Factores de Emisión

**Ver factores:**
1. En el menú, haz clic en **"Factores"**
2. Verás todos los factores de emisión disponibles

**Agregar factor:**
1. Haz clic en **"Nuevo Factor"**
2. Completa:
   - Nombre del factor
   - Categoría
   - Valor (kg CO₂e/unidad)
   - Metodología (IPCC, GHG Protocol, etc.)
3. Haz clic en **"Guardar"**

**Editar factor:**
1. Selecciona el factor
2. Haz clic en **"Editar"**
3. Modifica los valores
4. Guarda los cambios

---

## 🔧 Solución de Problemas

### Problemas de Inicio de Sesión

**No puedo iniciar sesión:**
- ✅ Verifica que tu email y contraseña sean correctos
- ✅ Asegúrate de que las mayúsculas/minúsculas sean correctas
- ✅ Intenta restablecer tu contraseña
- ✅ Verifica que tu cuenta esté activa

**Olvidé mi contraseña:**
1. En la página de login, haz clic en **"¿Olvidaste tu contraseña?"**
2. Ingresa tu email
3. Recibirás un enlace para restablecer
4. Sigue las instrucciones del email

**Mi sesión se cierra constantemente:**
- ✅ Verifica que las cookies estén habilitadas
- ✅ No uses modo incógnito
- ✅ Marca "Recordarme" al iniciar sesión
- ✅ Verifica la configuración de privacidad del navegador

### Problemas con Cálculos

**No puedo guardar un cálculo:**
- ✅ Verifica que todos los campos estén completos
- ✅ Asegúrate de que los valores sean numéricos válidos
- ✅ Verifica tu conexión a Internet
- ✅ Intenta recargar la página

**Los resultados no se ven correctos:**
- ✅ Verifica que hayas ingresado los valores correctos
- ✅ Revisa las unidades (kWh, km, kg)
- ✅ Contacta al administrador si persiste

### Problemas con Misiones

**Las misiones no se actualizan:**
- ✅ Recarga la página
- ✅ Verifica que hayas completado los requisitos
- ✅ Espera unos minutos (puede haber un retraso)

**No puedo iniciar una misión:**
- ✅ Verifica que cumplas los requisitos previos
- ✅ Asegúrate de no tener demasiadas misiones activas
- ✅ Verifica que la misión no haya expirado

### Problemas Técnicos

**La página no carga:**
- ✅ Verifica tu conexión a Internet
- ✅ Intenta en otro navegador
- ✅ Limpia la caché del navegador
- ✅ Contacta al soporte técnico

**Los gráficos no se muestran:**
- ✅ Verifica que JavaScript esté habilitado
- ✅ Intenta en otro navegador
- ✅ Desactiva extensiones que puedan interferir

**Errores 404 o 500:**
- ✅ Verifica la URL
- ✅ Intenta recargar la página
- ✅ Contacta al administrador del sistema

---

## ❓ Preguntas Frecuentes

### General

**¿Qué es EcoEstudiante?**
EcoEstudiante es una plataforma educativa para calcular y reducir tu huella de carbono personal como estudiante universitario.

**¿Es gratuito?**
Sí, EcoEstudiante es completamente gratuito para estudiantes.

**¿Necesito instalar algo?**
No, es una aplicación web que funciona en tu navegador. No requiere instalación.

### Cuenta y Perfil

**¿Puedo cambiar mi email?**
Sí, desde tu perfil puedes editar tu información, incluyendo el email. Nota: necesitarás verificar el nuevo email.

**¿Puedo eliminar mi cuenta?**
Sí, contacta al administrador para solicitar la eliminación de tu cuenta.

**¿Qué hago si olvidé mi contraseña?**
Usa la opción "¿Olvidaste tu contraseña?" en la página de login.

### Cálculos

**¿Con qué frecuencia debo registrar cálculos?**
Se recomienda registrar cálculos mensualmente para tener un seguimiento preciso.

**¿Puedo editar un cálculo ya guardado?**
Sí, desde la sección de historial puedes editar o eliminar cálculos anteriores.

**¿Los cálculos son precisos?**
Los cálculos utilizan factores de emisión validados científicamente (IPCC, GHG Protocol). Sin embargo, son estimaciones basadas en los datos que proporcionas.

### Gamificación

**¿Cómo gano más XP?**
- Registra cálculos regularmente
- Completa misiones
- Reduce tus emisiones
- Mantén rachas de días consecutivos

**¿Las misiones tienen fecha de expiración?**
Sí, cada misión tiene un tiempo límite. Revisa la fecha de expiración antes de iniciarla.

**¿Puedo ver el historial de mis misiones completadas?**
Sí, en la sección de gamificación puedes ver todas tus misiones completadas.

### Privacidad y Seguridad

**¿Mis datos son privados?**
Sí, tus datos personales están protegidos. Solo tú y los administradores autorizados pueden ver tu información personal.

**¿Se comparten mis datos con terceros?**
No, tus datos no se comparten con terceros. Los reportes agregados son anonimizados.

**¿Cómo se protegen mis datos?**
La plataforma utiliza encriptación, autenticación segura y cumple con estándares de protección de datos.

### Soporte

**¿Dónde puedo obtener ayuda?**
- Revisa este manual
- Contacta al administrador de tu institución
- Envía un email a: EcoEstudiante7@gmail.com

**¿Hay documentación adicional?**
Sí, consulta el README del proyecto para información técnica.

---

## 📞 Contacto y Soporte

Para preguntas, sugerencias o problemas:

- **Email**: EcoEstudiante7@gmail.com
- **Desarrollador**: [@HectorCano1411](https://github.com/HectorCano1411)
- **Repositorio**: [GitHub](https://github.com/HectorCano1411/ecoestudiante)

---

<div align="center">

**Última actualización**: Diciembre 2024

🌱 **EcoEstudiante** - Calculando el cambio, un estudiante a la vez

</div>





