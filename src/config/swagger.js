import swaggerJsdoc from "swagger-jsdoc";

const port = process.env.PORT || 3000;

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "EcoPoints RD API",
      version: "1.0.0",
      description: "Documentacion oficial de la API backend de EcoPoints RD",
    },
    servers: [
      {
        url: `http://localhost:${port}`,
        description: "Servidor local",
      },
    ],
    tags: [
      { name: "Health" },
      { name: "Auth" },
      { name: "Users" },
      { name: "Admin Users" },
      { name: "Organizations" },
      { name: "Missions" },
      { name: "Evidences" },
      { name: "QR" },
      { name: "Points" },
      { name: "Rewards" },
      { name: "Recycling" },
      { name: "Notifications" },
      { name: "Dashboard" },
      { name: "Logs" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        SuccessResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: "Operacion exitosa" },
            data: { type: "object" },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            message: { type: "string", example: "Descripcion del error" },
            errors: {
              type: "array",
              items: { type: "string" },
            },
          },
        },
        User: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            cedula: { type: "string", example: "00100000000" },
            first_name: { type: "string", example: "Alexander" },
            last_name: { type: "string", example: "Rodriguez" },
            email: { type: "string", format: "email" },
            phone: { type: "string", nullable: true },
            role: { type: "string", enum: ["USER", "AGENT", "AUDITOR", "ADMIN"] },
            status: { type: "string", enum: ["ACTIVE", "SUSPENDED", "BANNED"] },
            is_verified: { type: "boolean" },
            profile_image: { type: "string", nullable: true },
            country: { type: "string", nullable: true },
            province: { type: "string", nullable: true },
            municipality: { type: "string", nullable: true },
            address: { type: "string", nullable: true },
            points: { type: "integer", example: 0 },
            total_points_earned: { type: "integer", example: 0 },
            total_points_redeemed: { type: "integer", example: 0 },
            completed_missions: { type: "integer", example: 0 },
            created_at: { type: "string", format: "date-time" },
            updated_at: { type: "string", format: "date-time" },
          },
        },
        RegisterRequest: {
          type: "object",
          required: ["cedula", "first_name", "last_name", "email", "password"],
          properties: {
            cedula: { type: "string", example: "00100000000" },
            first_name: { type: "string", example: "Alexander" },
            last_name: { type: "string", example: "Rodriguez" },
            email: { type: "string", format: "email", example: "alexander@email.com" },
            password: { type: "string", format: "password", example: "12345678" },
            phone: { type: "string", example: "8090000000" },
            province: { type: "string", example: "Santo Domingo" },
            municipality: { type: "string", example: "Distrito Nacional" },
          },
        },
        LoginRequest: {
          type: "object",
          required: ["password"],
          properties: {
            email: { type: "string", format: "email", example: "alexander@email.com" },
            cedula: { type: "string", example: "00100000000" },
            password: { type: "string", format: "password", example: "12345678" },
          },
        },
        AuthResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: "Login correcto" },
            data: {
              type: "object",
              properties: {
                token: { type: "string" },
                user: { $ref: "#/components/schemas/User" },
              },
            },
          },
        },
        Mission: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            title: { type: "string" },
            description: { type: "string", nullable: true },
            mission_type: { type: "string", example: "CLEANUP" },
            status: { type: "string", enum: ["DRAFT", "PUBLISHED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] },
            points_reward: { type: "integer", example: 100 },
            start_date: { type: "string", format: "date-time", nullable: true },
            end_date: { type: "string", format: "date-time", nullable: true },
            province: { type: "string", nullable: true },
            municipality: { type: "string", nullable: true },
            address: { type: "string", nullable: true },
            requires_evidence: { type: "boolean" },
            requires_qr_validation: { type: "boolean" },
            organization_id: { type: "string", format: "uuid", nullable: true },
          },
        },
        Reward: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            title: { type: "string" },
            description: { type: "string", nullable: true },
            points_required: { type: "integer" },
            stock: { type: "integer" },
            image_url: { type: "string", nullable: true },
            sponsor_id: { type: "string", format: "uuid", nullable: true },
            status: { type: "string", enum: ["ACTIVE", "INACTIVE"] },
          },
        },
        PointTransaction: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            user_id: { type: "string", format: "uuid" },
            points: { type: "integer" },
            transaction_type: { type: "string", enum: ["EARNED", "REDEEMED", "BONUS", "PENALTY"] },
            description: { type: "string", nullable: true },
            created_at: { type: "string", format: "date-time" },
          },
        },
      },
      responses: {
        Unauthorized: {
          description: "Token no proporcionado o invalido",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
            },
          },
        },
        Forbidden: {
          description: "No tienes permisos para acceder a este recurso",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
            },
          },
        },
        NotFound: {
          description: "Recurso no encontrado",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
            },
          },
        },
      },
    },
    paths: {
      "/": {
        get: {
          summary: "Health de la API",
          tags: ["Health"],
          responses: {
            200: {
              description: "API disponible",
            },
          },
        },
      },
    },
  },
  apis: ["./src/routes/*.js", "./src/routes/**/*.js"],
};

export const swaggerSpec = swaggerJsdoc(options);
