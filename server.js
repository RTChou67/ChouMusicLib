const express = require("express");
const fs = require("fs").promises;
const path = require("path");
const { exec } = require("child_process");
const app = express();
const port = 3000;

const MUSIC_LIBRARY_PATH = "D:\\ChouMusicLib\\AlbumLibrary";
const TEMP_HTML_PATH = path.join(__dirname, 'temp.html');

app.use(express.json());
app.use(express.static(__dirname));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

app.post("/api/fetch-html", (req, res) => {
    const { url } = req.body;

    if (!url) {
        return res.status(400).json({ error: "请求无效，缺少URL。" });
    }
    
    const scriptPath = path.join(__dirname, 'fetch_with_edge.py');
    const command = `python "${scriptPath}" "${url}"`;

    console.log(`正在执行命令: ${command}`);

    exec(command, async (error, stdout, stderr) => {
        if (error) {
            console.error(`执行Python脚本时出错: ${error}`);
            console.error(`Python脚本的错误输出: ${stderr}`);
            return res.status(500).json({
                error: "服务器执行抓取脚本失败。",
                details: stderr || error.message,
            });
        }
        
        console.log(`Python脚本输出: ${stdout}`);
        
        try {
            const htmlContent = await fs.readFile(TEMP_HTML_PATH, 'utf8');
            console.log("成功读取 temp.html 的内容。");
            res.status(200).send(htmlContent);
        } catch (readError) {
            console.error(`读取 temp.html 文件失败: ${readError}`);
            res.status(500).json({
                error: "读取抓取结果文件失败。",
                details: readError.message,
            });
        }
    });
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
                albumData.fileName = fileName;
                return albumData;
            } catch (error) {
                console.error(`解析文件 ${fileName} 失败:`, error);
                return null;
            }
        });
        const albums = (await Promise.all(albumPromises)).filter(Boolean);
        res.json(albums);
    } catch (error) {
        console.error(`读取音乐库文件夹失败: ${MUSIC_LIBRARY_PATH}`, error);
        res.status(500).json({ error: "无法读取音乐库文件夹，请检查 server.js 中的路径配置。" });
    }
});

app.post("/api/save-album", async (req, res) => {
    try {
        // 1. 从请求体中解构出前端发送的三个关键信息
        const { albumData, isNew, originalFileName } = req.body;

        if (!albumData || !albumData.artist || !albumData.title) {
            return res.status(400).json({ error: "无效的专辑数据，缺少艺术家或标题。" });
        }

        // 2. 根据新数据计算出标准文件名
        const newSafeFileName = `${albumData.artist} - ${albumData.title}`.replace(/[<>:"/\\|?*]/g, "_") + ".json";
        
        // 确保 albumData 内部的 fileName 字段与我们将要写入的文件名一致
        albumData.fileName = newSafeFileName;
        const newFilePath = path.join(MUSIC_LIBRARY_PATH, newSafeFileName);
        const fileContent = JSON.stringify(albumData, null, 2);

        // 3. 处理更新现有专辑的逻辑
        if (!isNew && originalFileName) {
            const oldFilePath = path.join(MUSIC_LIBRARY_PATH, originalFileName);
            
            // 如果文件名发生了改变 (例如用户修改了标题/艺术家)
            if (originalFileName !== newSafeFileName) {
                console.log(`专辑已重命名: 从 ${originalFileName} -> ${newSafeFileName}`);
                // 先删除旧文件
                try {
                    await fs.unlink(oldFilePath);
                    console.log(`成功删除旧文件: ${oldFilePath}`);
                } catch(err) {
                    // 如果旧文件不存在，也没关系，可能是个小错误，记录一下即可
                    if (err.code !== 'ENOENT') throw err; // 如果是其他错误则抛出
                    console.warn(`尝试删除旧文件 ${originalFileName} 时未找到该文件，将直接创建新文件。`);
                }
            }
        }

        // 4. 写入新文件 (无论是创建还是更新)
        await fs.writeFile(newFilePath, fileContent, "utf8");
        
        console.log(`成功保存文件: ${newFilePath}`);
        res.status(200).json({ 
            message: "专辑已成功保存到库！", 
            fileName: newSafeFileName // 将最终确定的文件名返回给前端
        });

    } catch (error) {
        console.error("保存文件失败:", error);
        res.status(500).json({ error: "服务器在保存文件时发生错误。" });
    }
});

app.delete("/api/delete-album", async (req, res) => {
    try {
        const { fileName } = req.body;
        if (!fileName) {
            return res.status(400).json({ error: "无效的请求，缺少文件名。" });
        }
        if (fileName.includes("..") || fileName.includes("/") || fileName.includes("\\")) {
            return res.status(400).json({ error: "无效的文件名。" });
        }
        const filePath = path.join(MUSIC_LIBRARY_PATH, fileName);
        await fs.unlink(filePath);
        console.log(`成功删除文件: ${filePath}`);
        res.status(200).json({ message: `专辑 "${fileName}" 已成功删除。` });
    } catch (error) {
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