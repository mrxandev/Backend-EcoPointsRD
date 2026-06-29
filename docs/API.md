# EcoPointsRD API

Base URL local:

```txt
http://localhost:3000
```

Formato general de respuesta:

```json
{
  "success": true,
  "message": "Operacion exitosa",
  "data": {}
}
```

Para rutas privadas enviar:

```txt
Authorization: Bearer JWT_TOKEN
Content-Type: application/json
```

Roles disponibles:

```txt
USER
AUDITOR
AGENT
ADMIN
```

## Health

### GET /

Publico. Verifica que la API responde.

## Auth

### POST /api/auth/register

Publico. Registra usuario normal con rol `USER`.

Body:

```json
{
  "cedula": "00100000000",
  "first_name": "Alexander",
  "last_name": "Rodriguez",
  "email": "alexander@email.com",
  "password": "12345678",
  "phone": "8090000000",
  "province": "Santo Domingo",
  "municipality": "Distrito Nacional"
}
```

### POST /api/auth/login

Publico. Inicia sesion con email o cedula.

Body:

```json
{
  "email": "alexander@email.com",
  "password": "12345678"
}
```

Respuesta clave:

```json
{
  "data": {
    "token": "jwt",
    "user": {
      "id": "uuid",
      "first_name": "Alexander",
      "last_name": "Rodriguez",
      "email": "alexander@email.com",
      "role": "USER",
      "points": 0
    }
  }
}
```

### GET /api/auth/me

Privado. Devuelve el usuario autenticado.

### PUT /api/auth/change-password

Privado. Cambia la contrasena del usuario autenticado.

Body:

```json
{
  "current_password": "12345678",
  "new_password": "87654321"
}
```

## Users

### GET /api/users/me

Privado. Devuelve mi perfil.

### PUT /api/users/me

Privado. Actualiza mi perfil.

Body:

```json
{
  "first_name": "Alexander",
  "last_name": "Rodriguez",
  "phone": "8090000000",
  "province": "Santo Domingo",
  "municipality": "Santo Domingo Este",
  "address": "Direccion opcional",
  "profile_image": "https://example.com/me.jpg"
}
```

### GET /api/users/me/points

Privado. Devuelve puntos actuales y acumulados.

### GET /api/users/me/transactions

Privado. Devuelve historial de puntos del usuario.

## Admin Users

Todas requieren `ADMIN`.

### GET /api/admin/users

Lista usuarios.

Query opcional:

```txt
role=USER
status=ACTIVE
search=alex
page=1
limit=10
```

### GET /api/admin/users/:id

Detalle de usuario.

### POST /api/admin/users

Crea usuario desde backoffice.

Body:

```json
{
  "cedula": "00100000000",
  "first_name": "Juan",
  "last_name": "Perez",
  "email": "juan@email.com",
  "password": "12345678",
  "phone": "8090000000",
  "role": "AUDITOR",
  "province": "Santo Domingo",
  "municipality": "Distrito Nacional"
}
```

### PUT /api/admin/users/:id

Actualiza usuario.

Body parcial:

```json
{
  "first_name": "Juan",
  "last_name": "Perez",
  "phone": "8090000000",
  "role": "AUDITOR",
  "status": "ACTIVE",
  "province": "Santo Domingo",
  "municipality": "Distrito Nacional",
  "profile_image": "https://example.com/user.jpg"
}
```

### PATCH /api/admin/users/:id/suspend

Suspende usuario.

### PATCH /api/admin/users/:id/activate

Activa usuario.

### PATCH /api/admin/users/:id/ban

Banea usuario.

### DELETE /api/admin/users/:id

Marca usuario como `BANNED`.

## Organizations

### GET /api/organizations

Publico. Lista organizaciones activas.

### GET /api/organizations/:id

Publico. Detalle de organizacion.

### GET /api/admin/organizations

Requiere `ADMIN` o `AGENT`. Lista organizaciones para backoffice.

### POST /api/admin/organizations

Requiere `ADMIN`.

Body:

```json
{
  "name": "Ayuntamiento del Distrito Nacional",
  "description": "Institucion municipal",
  "organization_type": "MUNICIPALITY",
  "email": "info@example.com",
  "phone": "8090000000",
  "province": "Santo Domingo",
  "municipality": "Distrito Nacional",
  "address": "Direccion",
  "logo_url": "https://example.com/logo.png"
}
```

### PUT /api/admin/organizations/:id

Requiere `ADMIN`. Actualiza campos de organizacion.

### PATCH /api/admin/organizations/:id/activate

Requiere `ADMIN`.

### PATCH /api/admin/organizations/:id/deactivate

Requiere `ADMIN`.

### POST /api/admin/organizations/:id/users

Requiere `ADMIN`. Asigna usuario a organizacion.

Body:

```json
{
  "user_id": "uuid",
  "position": "Coordinador"
}
```

### DELETE /api/admin/organizations/:id/users/:userId

Requiere `ADMIN`. Quita usuario de organizacion.

## Missions

### GET /api/missions

Publico. Lista misiones publicadas o en progreso.

Query opcional:

```txt
type=CLEANUP
province=Santo Domingo
municipality=Distrito Nacional
status=PUBLISHED
```

### GET /api/missions/:id

Publico, pero si mandas token devuelve tambien estado de inscripcion del usuario.

### POST /api/missions/:id/register

Privado. Inscribe al usuario autenticado.

### DELETE /api/missions/:id/register

Privado. Cancela inscripcion.

### GET /api/missions/my/registrations

Privado. Lista mis misiones inscritas.

### POST /api/missions/:id/evidences

Privado. Sube evidencia.

Body:

```json
{
  "file_url": "https://example.com/evidence.jpg",
  "description": "Participe en la jornada"
}
```

### POST /api/missions/:id/validate

Requiere `AUDITOR`, `AGENT` o `ADMIN`. Valida participacion y otorga puntos.

Body:

```json
{
  "user_id": "uuid",
  "qr_token": "token_seguro",
  "notes": "Usuario participo correctamente"
}
```

### POST /api/missions/:id/reject

Requiere `AUDITOR`, `AGENT` o `ADMIN`.

Body:

```json
{
  "user_id": "uuid",
  "notes": "No cumplio los requisitos"
}
```

## Admin Missions

### GET /api/admin/missions

Requiere `ADMIN` o `AGENT`.

### GET /api/admin/missions/:id

Requiere `ADMIN` o `AGENT`. Incluye inscripciones, evidencias y validaciones.

### POST /api/admin/missions

Requiere `ADMIN` o `AGENT`.

Body:

```json
{
  "title": "Jornada de limpieza",
  "description": "Limpieza comunitaria",
  "mission_type": "CLEANUP",
  "points_reward": 100,
  "start_date": "2026-07-01T09:00:00",
  "end_date": "2026-07-01T12:00:00",
  "province": "Santo Domingo",
  "municipality": "Distrito Nacional",
  "address": "Malecon de Santo Domingo",
  "latitude": 18.4655,
  "longitude": -69.897,
  "max_participants": 100,
  "requires_evidence": true,
  "requires_qr_validation": true,
  "requires_approval": false,
  "organization_id": "uuid"
}
```

### PUT /api/admin/missions/:id

Requiere `ADMIN` o `AGENT`. Actualiza campos de mision.

### PATCH /api/admin/missions/:id/publish

Requiere `ADMIN` o `AGENT`.

### PATCH /api/admin/missions/:id/start

Requiere `ADMIN` o `AGENT`.

### PATCH /api/admin/missions/:id/complete

Requiere `ADMIN` o `AGENT`.

### PATCH /api/admin/missions/:id/cancel

Requiere `ADMIN` o `AGENT`.

### DELETE /api/admin/missions/:id

Requiere `ADMIN`.

## Evidences

### GET /api/admin/evidences

Requiere `ADMIN` o `AGENT`.

Query opcional:

```txt
status=PENDING
mission_id=uuid
```

### PATCH /api/admin/evidences/:id/approve

Requiere `ADMIN` o `AGENT`.

### PATCH /api/admin/evidences/:id/reject

Requiere `ADMIN` o `AGENT`.

Body opcional:

```json
{
  "notes": "Motivo de rechazo"
}
```

## QR

### POST /api/qr/generate

Privado. Genera token QR de 5 minutos.

Respuesta clave:

```json
{
  "data": {
    "qr_session_id": "uuid",
    "token": "token_seguro",
    "expires_at": "fecha"
  }
}
```

### POST /api/qr/validate

Requiere `AUDITOR`, `AGENT` o `ADMIN`.

Body:

```json
{
  "token": "token_seguro"
}
```

## Points

### GET /api/points/balance

Privado. Balance del usuario autenticado.

### GET /api/points/transactions

Privado. Historial del usuario.

Query opcional:

```txt
type=EARNED
page=1
limit=10
```

### GET /api/points/ranking

Publico. Ranking por puntos.

Query opcional:

```txt
province=Santo Domingo
limit=50
```

### POST /api/admin/points/adjust

Requiere `ADMIN`. Ajuste manual de puntos.

Body:

```json
{
  "user_id": "uuid",
  "points": 50,
  "transaction_type": "BONUS",
  "description": "Bono por actividad especial"
}
```

`transaction_type` acepta `BONUS` o `PENALTY`.

### GET /api/admin/points/transactions

Requiere `ADMIN`.

Query opcional:

```txt
user_id=uuid
type=EARNED
from=2026-01-01
to=2026-12-31
```

## Rewards

### GET /api/rewards

Publico. Lista recompensas activas.

### GET /api/rewards/:id

Publico. Detalle de recompensa.

### POST /api/rewards/:id/redeem

Privado. Canjea recompensa usando puntos.

### GET /api/rewards/my/redemptions

Privado. Mis canjes.

### POST /api/admin/rewards

Requiere `ADMIN`.

Body:

```json
{
  "title": "Cupon de descuento",
  "description": "10% de descuento",
  "points_required": 500,
  "stock": 100,
  "image_url": "https://example.com/reward.jpg",
  "sponsor_id": "uuid"
}
```

### GET /api/admin/rewards

Requiere `ADMIN` o `AGENT`.

### PUT /api/admin/rewards/:id

Requiere `ADMIN`.

### PATCH /api/admin/rewards/:id/activate

Requiere `ADMIN`.

### PATCH /api/admin/rewards/:id/deactivate

Requiere `ADMIN`.

### GET /api/admin/redemptions

Requiere `ADMIN` o `AGENT`.

### PATCH /api/admin/redemptions/:id/approve

Requiere `ADMIN`.

### PATCH /api/admin/redemptions/:id/deliver

Requiere `ADMIN`.

### PATCH /api/admin/redemptions/:id/cancel

Requiere `ADMIN`.

## Recycling

### GET /api/recycling/centers

Publico. Lista centros activos.

Query opcional:

```txt
province=Santo Domingo
municipality=Distrito Nacional
```

### GET /api/recycling/centers/:id

Publico. Detalle de centro.

### POST /api/admin/recycling/centers

Requiere `ADMIN`.

Body:

```json
{
  "name": "Centro de reciclaje",
  "description": "Descripcion",
  "province": "Santo Domingo",
  "municipality": "Distrito Nacional",
  "address": "Direccion",
  "latitude": 18.4655,
  "longitude": -69.897,
  "phone": "8090000000"
}
```

### PUT /api/admin/recycling/centers/:id

Requiere `ADMIN`.

### PATCH /api/admin/recycling/centers/:id/activate

Requiere `ADMIN`.

### PATCH /api/admin/recycling/centers/:id/deactivate

Requiere `ADMIN`.

### POST /api/admin/recycling/logs

Requiere `ADMIN`, `AGENT` o `AUDITOR`.

Body:

```json
{
  "user_id": "uuid",
  "center_id": "uuid",
  "material_type": "PLASTIC",
  "weight_kg": 2.5,
  "points_awarded": 50
}
```

### GET /api/admin/recycling/logs

Requiere `ADMIN` o `AGENT`.

## Notifications

### GET /api/notifications

Privado. Mis notificaciones.

### PATCH /api/notifications/:id/read

Privado. Marca una notificacion como leida.

### PATCH /api/notifications/read-all

Privado. Marca todas como leidas.

### POST /api/admin/notifications/user

Requiere `ADMIN`.

Body:

```json
{
  "user_id": "uuid",
  "title": "Nueva mision disponible",
  "message": "Hay una mision cerca de tu zona",
  "type": "MISSION"
}
```

### POST /api/admin/notifications/global

Requiere `ADMIN`.

Body:

```json
{
  "title": "Nueva campana nacional",
  "message": "Participa en las jornadas de reciclaje",
  "type": "SYSTEM"
}
```

## Dashboard

Todas requieren `ADMIN` o `AGENT`.

### GET /api/admin/dashboard/summary

Resumen general.

### GET /api/admin/dashboard/users

Usuarios por rol, estado y mes.

### GET /api/admin/dashboard/missions

Misiones por tipo, estado, popularidad y puntos.

### GET /api/admin/dashboard/points

Totales de puntos, top usuarios y transacciones recientes.

### GET /api/admin/dashboard/rewards

Recompensas mas canjeadas, sin stock y estados de canjes.

## Logs

### GET /api/admin/logs

Requiere `ADMIN`.

Query opcional:

```txt
user_id=uuid
action=MISSION_VALIDATED
entity_type=missions
```

### GET /api/admin/logs/:id

Requiere `ADMIN`. Detalle de un log.
