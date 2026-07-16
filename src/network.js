const GameNetwork = {
    BLACK: 1, WHITE: 2,
    client: null, roomId: null, isOnline: false, myRole: null, onMessageCallback: null, topic: '',
    get conn() { return this.client && this.client.connected ? this.client : null; },
    generateId() { return crypto.randomUUID().slice(0, 8).toUpperCase(); },
    init() {
        const urlParams = new URLSearchParams(window.location.search);
        const roomId = urlParams.get('room');
        if (roomId) {
            const joinModal = document.getElementById('joinOnlineModal');
            joinModal.classList.remove('hidden');
            document.getElementById('joinConfirmBtn').addEventListener('click', () => {
                joinModal.classList.add('hidden');
                this.startOnlineMode(roomId);
            }, { once: true });
            document.getElementById('joinCancelBtn').addEventListener('click', () => {
                joinModal.classList.add('hidden');
                const url = new URL(window.location.href);
                url.searchParams.delete('room');
                window.history.replaceState({}, document.title, url.pathname);
                if (typeof initGame === 'function') initGame();
            }, { once: true });
        }
        const aiBtn = document.getElementById('aiPKBtn');
        const aiModal = document.getElementById('confirmAIModeModal');
        const aiConfirm = document.getElementById('aiConfirmBtn');
        const aiCancel = document.getElementById('aiCancelBtn');

        aiBtn.addEventListener('click', () => {
            // 无论是本来就是人机，还是从联机转人机，都弹出确认
            aiModal.classList.remove('hidden');
        });

        aiConfirm.addEventListener('click', () => {
            aiModal.classList.add('hidden');
            this.stopOnlineMode(); // stop内会调用initGame
        });

        aiCancel.addEventListener('click', () => {
            aiModal.classList.add('hidden');
        });

        const onlineBtn = document.getElementById('onlinePKBtn');
        const pkModal = document.getElementById('confirmPKModal');
        const pkConfirm = document.getElementById('pkConfirmBtn');
        const pkCancel = document.getElementById('pkCancelBtn');

        onlineBtn.addEventListener('click', () => {
            if (!this.isOnline) {
                pkModal.classList.remove('hidden');
            } else {
                // 如果已经在联机，点击按钮则是退出联机
                this.stopOnlineMode();
            }
        });

        pkConfirm.addEventListener('click', () => {
            pkModal.classList.add('hidden');
            this.startOnlineMode();
            if (typeof initGame === 'function') initGame();
        });

        pkCancel.addEventListener('click', () => {
            pkModal.classList.add('hidden');
        });

        document.getElementById('copyBtn').addEventListener('click', async function () {
            const shareLink = document.getElementById('shareLink');
            if (shareLink && shareLink.value) {
                try {
                    await navigator.clipboard.writeText(shareLink.value);
                    this.textContent = '已复制!';
                } catch {
                    this.textContent = '复制失败';
                }
                setTimeout(() => this.textContent = '复制', 2000);
            }
        });
    },
    startOnlineMode(targetRoomId = null) {
        this.isOnline = true;
        this.roomId = targetRoomId || this.generateId();
        this.myRole = targetRoomId ? this.WHITE : this.BLACK;
        this.topic = `fs_gomoku/room/${this.roomId}`;
        document.getElementById('onlineControls').classList.remove('hidden');
        document.getElementById('aiControls').classList.add('hidden');
        document.getElementById('onlinePKBtn').textContent = '退出联机';
        document.getElementById('aiPKBtn').style.opacity = '0.6';
        this.updateStatus('正在接入云端 (杭州节点)...');
        const brokerUrl = 'wss://broker.emqx.io:8084/mqtt';
        const clientId = 'user_' + Math.random().toString(16).substr(2, 8);
        this.client = mqtt.mqtt ? mqtt.mqtt.connect(brokerUrl) : mqtt.connect(brokerUrl, { clean: true, connectTimeout: 5000, clientId: clientId, keepalive: 60 });
        this.client.on('connect', () => {
            this.client.subscribe(this.topic, (err) => {
                if (!err) {
                    this.updateStatus(targetRoomId ? '已加入对局' : '中转开启，等待好友');
                    if (targetRoomId) this.send({ type: 'guest_ready' });
                }
            });
            if (!targetRoomId) {
                const roomLink = window.location.origin + window.location.pathname + '?room=' + this.roomId;
                document.getElementById('shareLink').value = roomLink;
            }
        });
        this.client.on('message', (topic, message) => {
            let data;
            try {
                data = JSON.parse(message.toString());
            } catch {
                return;
            }
            if (!isValidNetworkMessage(data)) return;
            if (data._sender === clientId) return;
            if (data.type === 'guest_ready' && this.myRole === this.BLACK) {
                this.updateStatus('联机成功！请开局');
                // 发送开始信号
                this.send({ type: 'start', role: this.WHITE });
                // 重点：房主自己也需要重置棋盘，防止旧数据残留
                if (this.onMessageCallback) this.onMessageCallback({ type: 'start' });
            }
            if (this.onMessageCallback) this.onMessageCallback(data);
        });
        this.client.on('error', (err) => { this.updateStatus('❌ 接入繁忙，请重试'); });
        this.client.on('offline', () => { this.updateStatus('❌ 网络已断开信号'); });
    },
    stopOnlineMode() {
        this.isOnline = false;
        if (this.client) { this.client.end(); this.client = null; }
        document.getElementById('onlineControls').classList.add('hidden');
        document.getElementById('aiControls').classList.remove('hidden');
        document.getElementById('onlinePKBtn').textContent = '互联网 PK';
        document.getElementById('aiPKBtn').style.opacity = '1';
        const url = new URL(window.location.href);
        url.searchParams.delete('room');
        window.history.replaceState({}, document.title, url.pathname);
        if (typeof initGame === 'function') initGame();
    },
    send(data) { if (this.client && this.client.connected) { data._sender = this.client.options.clientId; this.client.publish(this.topic, JSON.stringify(data)); } },
    updateStatus(msg) {
        const badge = document.getElementById('onlineStatus');
        if (badge) {
            badge.textContent = msg;
            if (msg.includes('成功') || msg.includes('开启')) badge.style.background = '#388e3c';
            else if (msg.includes('❌')) badge.style.background = '#d32f2f';
            else badge.style.background = '#f57c00';
        }
    },
    onMessage(callback) { this.onMessageCallback = callback; }
};

function isValidNetworkMessage(data) {
    if (!data || typeof data !== 'object') return false;
    if (['guest_ready', 'start', 'restart'].includes(data.type)) return true;
    return data.type === 'move'
        && Number.isInteger(data.x) && data.x >= 0 && data.x < 15
        && Number.isInteger(data.y) && data.y >= 0 && data.y < 15;
}

if (typeof module !== 'undefined') module.exports = { isValidNetworkMessage };
