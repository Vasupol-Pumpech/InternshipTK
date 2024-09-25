var express = require('express');
var cors = require('cors');
var app = express();
var bodyParser = require('body-parser');
var jsonParser = bodyParser.json();
const mysql = require('mysql2');
var jwt = require('jsonwebtoken');
const secret = 'internship-login';

app.use(cors());

// conn DB 
const conn = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    database: 'internshipdb',
});

// ฟังก์ชันตรวจสอบผู้ดูแลระบบ
function verifyAdmin(req, res, next) {
    const token = req.headers['authorization'] ? req.headers['authorization'].split(' ')[1] : null;

    if (!token) {
        return res.status(401).json({ error: 'Token is required' }); // ถ้าไม่มี token ให้ส่งกลับ error
    }

    jwt.verify(token, secret, function(err, decoded) {
        if (err) {
            return res.status(401).json({ error: 'Invalid Token' }); // ถ้า token ไม่ถูกต้องให้ส่งกลับ error
        }

        // ตรวจสอบบทบาท
        if (decoded.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied. Admins only.' }); // ถ้าไม่ใช่ admin ให้ส่งกลับ error
        }

        next(); // ถ้าผ่านการตรวจสอบให้ไปยังเส้นทางถัดไป
    });
}

// Register
app.post('/register', jsonParser, function (req, res, next) {
    const validRoles = ['admin', 'user']; // รายการบทบาทที่ถูกต้อง
    if (!validRoles.includes(req.body.role)) {
        return res.status(400).send('Invalid role'); // ถ้าบทบาทไม่ถูกต้องให้ส่งกลับ error
    }

    conn.execute(
        'INSERT INTO account (username, password, role) VALUES (?, ?, ?)',
        [req.body.username, req.body.password, req.body.role],
        function(err, result, fields) {
            if (err) {
                res.status(500).send('Database query failed: ' + err.message); // ถ้า query ไม่สำเร็จให้ส่งกลับ error
                return;
            }
            res.json({status:'INSERT OK :D'}); // ส่งกลับข้อความยืนยันการเพิ่มข้อมูล
        }
    );
});

// Login
app.post('/login', jsonParser, function (req, res, next) {
    conn.execute(
        'SELECT * FROM account WHERE username=?',
        [req.body.username],
        function(err, users, fields) {
            if (err) {
                res.status(500).send('Database query failed: ' + err.message); // ถ้า query ไม่สำเร็จให้ส่งกลับ error
                return;
            }
            if (users.length === 0) {
                res.status(401).send('No User Found'); // ถ้าไม่พบผู้ใช้ให้ส่งกลับ error
                return; 
            }

            const user = users[0];
            if (user.password !== req.body.password) {
                return res.status(401).send('Invalid Password'); // ถ้ารหัสผ่านไม่ถูกต้องให้ส่งกลับ error
            }

            // Generate JWT token with username included
            const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, secret, { expiresIn: '1h' });
            res.json({ 
                token, 
                username: user.username, // ส่งกลับ username ด้วย
                role: user.role 
            });
        }
    );
});

// Authen
app.post('/authen', jsonParser, function (req, res, next) {
    const token = req.headers['authorization'] ? req.headers['authorization'].split(' ')[1] : null;

    if (!token) {
        return res.status(401).json({ error: 'Token is required' }); // ถ้าไม่มี token ให้ส่งกลับ error
    }

    jwt.verify(token, secret, function(err, decoded) {
        if (err) {
            return res.status(401).json({ error: 'Invalid Token' }); // ถ้า token ไม่ถูกต้องให้ส่งกลับ error
        }

        // Token ถูกต้อง
        res.json({ 
            token,
            username: decoded.username, // ส่งกลับ username
            role: decoded.role // ส่งกลับ role
        });
    });
});

// ใช้ verifyAdmin ในเส้นทางที่ต้องการ
app.get('/admin', verifyAdmin, function(req, res) {
    res.json({ message: 'Welcome Admin!' }); // แสดงข้อความสำหรับ admin
});

// ลบผู้ใช้
app.delete('/delete-user/:id', verifyAdmin, function(req, res) {
    // โค้ดในการลบผู้ใช้
    res.json({ message: 'User deleted successfully' }); // ส่งกลับข้อความยืนยันการลบผู้ใช้
});

app.listen(3333, function () {
    console.log('CORS-enabled web server listening on port 3333'); // แจ้งว่าเซิร์ฟเวอร์กำลังทำงาน
});
