import express from 'express';
import productRouter from './routes/productDB.router.js';
import cartsRouter from './routes/cartsDB.router.js';
import __dirname from './utils.js';
import viewsRouter from './routes/views.router.js'
import handlebars from 'express-handlebars';
import { Server } from 'socket.io';
import ProductManagerDB from './dao/managers/productManagerDB.js';
import mongoose from 'mongoose';
import { messageModel } from './dao/models/messages.model.js';
import 'dotenv/config'

const listaProductos = new ProductManagerDB();
const app = express();
const httpServer = app.listen(8080,() => console.log('servidor escuchando en el puerto 8080'));
const socketServer = new Server(httpServer)
const DBConnection = mongoose.connect(process.env.MONGO);
app.engine('handlebars', handlebars.engine());
app.set('views', `${__dirname}/views`);
app.set('view engine', 'handlebars')
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(express.static(__dirname+'/public'))
app.use('/api/products', productRouter);
app.use('/api/carts', cartsRouter);
app.use('/',viewsRouter);

socketServer.on('connection', socket=> {
    console.log("Nuevo cliente conectado");
    socket.on('delete', async (data) => {
        try {
            await listaProductos.deleteProduct(data);
            socketServer.emit('tabla', await listaProductos.getProducts());
        } catch (error) {
            console.log(error);
        }
    });
    socket.on('create', async (data) => {
        try {
            await listaProductos.addProduct(data);
            socketServer.emit('tabla', await listaProductos.getProducts());
        } catch (error) {
            console.log(error);
        }
    });
    socket.on('message', async (data) => {
        try {
            await messageModel.create(data);
            socketServer.emit('messageLogs', await messageModel.find({}));
        } catch (error) {
            console.log(error);
        }
    });
});

process.on('SIGINT', () => {
    mongoose.connection.close(() => {
        console.log('MongoDB disconnected on app termination');
        process.exit(0);
    });
});
