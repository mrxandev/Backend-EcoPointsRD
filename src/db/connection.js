import pg from "pg"
import dotenv from "dotenv"

dotenv.config()

const {Pool}=pg

export const pool = new Pool({
    connectionString:process.env.DATABASE_URL,
    ssl:{
        rejectUnauthorized:false
    }
})

// Probando conexion

pool.connect()
.then(()=>console.log('Base de Datos conectada'))
.catch((err)=>console.error('Error al conectar a la Base de Datos:',err))