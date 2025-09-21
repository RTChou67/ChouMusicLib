// server.js (层次二：添加了保存功能的版本)

const express = require("express");
const fs = require("fs").promises;
const path = require("path");
const app = express();
const port = 3000;

const MUSIC_LIBRARY_PATH = "D:\\MusicLibrary\\AlbumLibrary";

// [新增] 让Express能够解析请求体中的JSON数据
app.use(express.json());
app.use(express.static(__dirname));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/api/albums", async (req, res) => {
    try {
        const files = await fs.readdir(MUSIC_LIBRARY_PATH);
        const jsonFiles = files.filter((file) => path.extname(file).toLowerCase() === ".json");

        const albumPromises = jsonFiles.map(async (fileName) => {
            const filePath = path.join(MUSIC_LIBRARY_PATH, fileName);
            try {
                const fileContent = await fs.readFile(filePath, "utf8");
                const albumData = JSON.parse(fileContent);
                albumData.fileName = fileName; // 将文件名也添加到数据中，保持和原应用逻辑一致
                return albumData;
            } catch (error) {
                console.error(`解析文件 ${fileName} 失败:`, error);
                return null; // 如果某个文件解析失败，返回 null
            }
        });

        const albums = (await Promise.all(albumPromises)).filter(Boolean); // 等待所有文件读取完成，并过滤掉失败的
        res.json(albums); // 将整合好的专辑数组作为 JSON 响应返回
    } catch (error) {
        console.error(`读取音乐库文件夹失败: ${MUSIC_LIBRARY_PATH}`, error);
        res.status(500).json({ error: "无法读取音乐库文件夹，请检查 server.js 中的路径配置。" });
    }
});

// [新增] 创建一个用于保存专辑JSON文件的API接口
app.post("/api/save-album", async (req, res) => {
    try {
        const albumData = req.body; // 获取从前端发送过来的JSON数据

        if (!albumData || !albumData.artist || !albumData.title) {
            // 返回400错误，表示客户端请求无效
            return res.status(400).json({ error: "无效的专辑数据，缺少艺术家或标题。" });
        }

        // 根据艺术家和标题生成一个安全的文件名
        const safeFileName = `${albumData.artist} - ${albumData.title}`.replace(/[<>:"/\\|?*]/g, "_") + ".json";
        const filePath = path.join(MUSIC_LIBRARY_PATH, safeFileName);

        // 将JSON数据格式化后写入文件
        await fs.writeFile(filePath, JSON.stringify(albumData, null, 2), "utf8");

        console.log(`成功保存文件: ${filePath}`);
        // 返回200成功状态和消息
        res.status(200).json({ message: "专辑已成功保存到库！", filePath: filePath });
    } catch (error) {
        console.error("保存文件失败:", error);
        // 返回500错误，表示服务器内部错误
        res.status(500).json({ error: "服务器在保存文件时发生错误。" });
    }
});
app.delete("/api/delete-album", async (req, res) => {
    try {
        const { fileName } = req.body; // 从请求体中获取要删除的文件名

        if (!fileName) {
            return res.status(400).json({ error: "无效的请求，缺少文件名。" });
        }

        // 安全性检查：确保文件名不包含路径遍历字符
        if (fileName.includes("..") || fileName.includes("/") || fileName.includes("\\")) {
            return res.status(400).json({ error: "无效的文件名。" });
        }

        const filePath = path.join(MUSIC_LIBRARY_PATH, fileName);

        // 使用fs.unlink删除文件
        await fs.unlink(filePath);

        console.log(`成功删除文件: ${filePath}`);
        res.status(200).json({ message: `专辑 "${fileName}" 已成功删除。` });
    } catch (error) {
        // 如果文件不存在等错误
        if (error.code === "ENOENT") {
            console.error(`尝试删除失败，文件未找到: ${error.path}`);
            return res.status(404).json({ error: "删除失败，文件未在库中找到。" });
        }
        console.error("删除文件时发生错误:", error);
        res.status(500).json({ error: "服务器在删除文件时发生错误。" });
    }
});
app.listen(port, () => {
    console.log(`音乐库服务器已启动！`);
    console.log(`请在浏览器中打开 http://localhost:${port}`);
});
