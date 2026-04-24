const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs-extra');
const path = require('path');

const app = express();
const PORT = 3000;
const RESOURCE_DIR = path.join(__dirname, 'resources');

app.use(bodyParser.json({ limit: '10mb' }));
app.use(express.static(__dirname));
app.use('/resources', express.static(RESOURCE_DIR));

// 특정 날짜의 데이터 로드
app.get('/api/load/:date', async (req, res) => {
    const date = req.params.date; // YYYY-MM-DD
    const imgPath = path.join(RESOURCE_DIR, `${date}_그림.jpg`);
    const txtPath = path.join(RESOURCE_DIR, `${date}_내용.txt`);

    try {
        let imageData = null;
        let textData = "";

        if (await fs.pathExists(imgPath)) {
            const buffer = await fs.readFile(imgPath);
            imageData = `data:image/jpeg;base64,${buffer.toString('base64')}`;
        }
        if (await fs.pathExists(txtPath)) {
            textData = await fs.readFile(txtPath, 'utf8');
        }

        res.json({ success: true, imageData, textData });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 오늘의 데이터 저장
app.post('/api/save', async (req, res) => {
    const { date, imageData, textData } = req.body;
    const imgPath = path.join(RESOURCE_DIR, `${date}_그림.jpg`);
    const txtPath = path.join(RESOURCE_DIR, `${date}_내용.txt`);

    try {
        if (imageData) {
            const base64Data = imageData.replace(/^data:image\/jpeg;base64,/, "");
            await fs.writeFile(imgPath, base64Data, 'base64');
        }
        if (textData !== undefined) {
            await fs.writeFile(txtPath, textData, 'utf8');
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
