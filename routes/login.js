var express = require('express');
var bcrypt = require('bcryptjs');
var jwt = require('jsonwebtoken');

var SEED = require('../config/config').SEDD;


var app = express();

var Usuario = require('../models/usuario');

// Google
var CLIENT_ID = require('../config/config').CLIENT_ID;

const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(CLIENT_ID);

//================================================= 
// Autenticacion google
// ================================================
async function verify(token) {
    const ticket = await client.verifyIdToken({
        idToken: token,
        audience: CLIENT_ID,  // Specify the CLIENT_ID of the app that accesses the backend
        // Or, if multiple clients access the backend:
        //[CLIENT_ID_1, CLIENT_ID_2, CLIENT_ID_3]
    });

    const payload = ticket.getPayload();
    // const userid = payload['sub'];
    // If request specified a G Suite domain:
    //const domain = payload['hd'];

    return {
        nombre: payload.name,
        email: payload.email,
        img: payload.picture,
        google: true

    }
  }

app.post('/google', (req, res) => {

    var token = req.body.token || 'XXX';

    var client = new WebAuthentication.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_SECRET, '');

    client.verifyIdToken(
        token,
        GOOGLE_CLIENT_ID,
        // Or, if multiple clients access the backend:
        // [CLIENT_ID_1, CLIENT_ID_2, CLIENT_ID_3],
        function(e, login) {
            if(e) {
                return res.status(400).json({
                    ok:true,
                    mensaje: 'Token no valido',
                    errors: e
                });
            }

            var payload = login.getPayload();
            var userid = payload['sub'];
            // If requuest specified a G Suite domain:
            // var domain = payload['hd];

        // .catch( e => {
        //     res.status(403).json({
        //         ok: false,
        //         mensaje: 'Token no valido',
        //     });
        // });

Usuario.findOne( {email: payload.email }, ( err, usuario ) => {
    
    if ( err ){
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al buscar  usuario -login',
            errors: err
        });
    }

    if ( usuario ) {

        if ( usuario.google === false ) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Debe usar su autenticacion normal',
            });  
        } else {
            usuario.password = ':)';
            var token = jwt.sign({ usuario: usuarioDB }, SEED, { expiresIn: 14400 }); 
// 4 horas
            res.status(200).json({
                ok: true,
                usuario: usuario,
                token: token,
                id: usuarioDB._id,
                menu: obtenerMenu(usuario.role)
            });
        }
        
    } else {
        // El usuario no exite hay que crearlo
        var usuario = new Usuario();

        usuario.nombre = payload.name;
        usuario.email = payload.email;
        usuario.password = ':)';
        usuario.img = payload.picture;
        usuario.google = true;

        usuario.save(( err, usuarioDB ) => {

            if (err) {
                return res.status(500).json({
                    ok: true,
                    mensaje: 'Error al crear usuario - google',
                    errors: err
                });
            }
            var token = jwt.sign({ usuario: usuarioDB }, SEED, { expiresIn: 14400 }); 
            // 4 horas
            res.status(200).json({
                ok: true,
                usuario: usuarioDB,
                token: token,
                id: usuarioDB._id,
                menu: obtenerMenu(usuarioDB.role)
            });
        });
    }
});

    // res.status(200).json({
    //     ok: true,
    //     mensaje: 'OK',
    //     googleUser: googleUser
    // });
})
//================================================= 
// Autenticacion normal
// ================================================
app.post('/', (req, res ) => {

    var body = req.body;

    Usuario.findOne({ email: body.email}, (err, usuarioDB) => {
        if ( err ){
            return res.status(500).json({
                ok: false,
                mensaje: 'Error al buscar  usuario',
                errors: err
            });
        }
        if ( !usuarioDB ){
            return res.status(400).json({
                ok: false,
                mensaje: 'Credenciales incorrectas - email',
                errors: err
            });
        }

        if( !bcrypt.compareSync( body.password, usuarioDB.password))
            return res.status(400).json({
            ok: false,
            mensaje: 'Credenciales incorrectas - password',
            errors: err
            });
        
            // Crear un Token !!!
            usuarioDB.password = ':)';
            var token = jwt.sign({ usuario: usuarioDB }, SEED, { expiresIn: 14400 }); 
// 4 horas
        res.status(200).json({
            ok: true,
            usuario: usuarioDB,
            token: token,
            id: usuarioDB._id, 
            menu: obtenerMenu(usuarioDB.role)
        });
    })
});

function obtenerMenu ( ROLE ) {

    var menu = [
          {
            titulo: 'Principal',
            icono: 'mdi mdi-gauge',
            submenu: [
              { titulo: 'Dashboard', url: '/dashboard' },
              { titulo : 'ProgressBar', url: '/progress' },
              { titulo: 'Gráficas', url: '/graficas1' },
              { titulo: 'Promesas', url: '/promesas' },
              { titulo: 'RxJs', url: '/rxjs' }
            ]
          },
          {
            titulo: 'Mantenimientos',
            icono: 'mdi mdi-folder-lock-open',
            submenu: [
            //   { titulo: 'Usuarios', url: '/usuarios' },
              { titulo: 'Hospitales', url: '/hospitales' },
              { titulo: 'Médicos', url: '/medicos' }
            ]
          }
        ];

        if ( ROLE === 'ADMIN_ROLE') {
            menu[1].submenu.unshift( { titulo: 'Usuarios', url: '/usuarios' } );
        }


    return menu;
}

module.exports = app ;