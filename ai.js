/**
 * 仙剑棋婷 AI 逻辑 (Minimax with Alpha-Beta Pruning / Heuristic Evaluation)
 */

// 评估分数常量
const SCORES = {
    FIVE: 10000000,
    FOUR_OPEN: 100000,
    FOUR_CLOSED: 10000,
    THREE_OPEN: 10000,
    THREE_CLOSED: 1000,
    TWO_OPEN: 1000,
    TWO_CLOSED: 100,
    ONE_OPEN: 10,
    ONE_CLOSED: 1
};

// 简单的启发式AI，计算每个空位的得分，选择得分最高的点落子
function getBestMove(board, aiPlayer, difficulty) {
    const size = board.length;
    const humanPlayer = aiPlayer === 1 ? 2 : 1;

    let bestScore = -Infinity;
    let bestMoves = [];

    // 如果是第一步，且天元(7,7)为空，直接在此落子
    let emptyCount = 0;
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            if (board[i][j] === 0) emptyCount++;
        }
    }
    if (emptyCount === size * size && board[7][7] === 0) {
        return { x: 7, y: 7 };
    }

    // 遍历所有空位，计算放置AI棋子和玩家棋子的得分（进攻与防守）
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            if (board[i][j] === 0) {
                // 如果周围没有棋子，跳过计算（优化性能方案）
                if (!hasNeighbor(board, i, j, 2)) continue;

                // 进攻得分（放置AI棋子）
                let attackScore = evaluatePoint(board, i, j, aiPlayer);
                // 防守得分（放置玩家棋子）
                let defenseScore = evaluatePoint(board, i, j, humanPlayer);

                // 难度调整：低难度时防守权重低
                let totalScore = 0;
                if (difficulty === 1) { // 新手
                    totalScore = attackScore + defenseScore * 0.5;
                    // 引入一些随机性，有时不走最优解
                    totalScore += Math.random() * 500;
                } else if (difficulty === 2) { // 进阶
                    totalScore = attackScore + defenseScore;
                } else { // 大师
                    // 更加重视防守（如果你快赢了，我就堵你）
                    totalScore = attackScore + defenseScore * 1.2;
                    // 如果防守分数达到活四级别，必须防守
                    if (defenseScore >= SCORES.FOUR_CLOSED) {
                        totalScore += SCORES.FOUR_OPEN;
                    }
                }

                if (totalScore > bestScore) {
                    bestScore = totalScore;
                    bestMoves = [{ x: i, y: j }];
                } else if (totalScore === bestScore) {
                    bestMoves.push({ x: i, y: j });
                }
            }
        }
    }

    // 从得分相同的最佳步中随机选一个
    if (bestMoves.length > 0) {
        return bestMoves[Math.floor(Math.random() * bestMoves.length)];
    }

    // 如果没有找到（棋盘满或无邻居），随便找个空位
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            if (board[i][j] === 0) return { x: i, y: j };
        }
    }
    return null;
}

// 检查周围 radius 范围内是否有棋子
function hasNeighbor(board, x, y, radius) {
    const size = board.length;
    const startX = Math.max(0, x - radius);
    const endX = Math.min(size - 1, x + radius);
    const startY = Math.max(0, y - radius);
    const endY = Math.min(size - 1, y + radius);

    for (let i = startX; i <= endX; i++) {
        for (let j = startY; j <= endY; j++) {
            if (i === x && j === y) continue;
            if (board[i][j] !== 0) return true;
        }
    }
    return false;
}

// 评估在一个点落子的价值
function evaluatePoint(board, x, y, player) {
    let score = 0;
    const directions = [
        [1, 0],  // 水平
        [0, 1],  // 垂直
        [1, 1],  // 右斜
        [1, -1]  // 左斜
    ];

    for (let [dx, dy] of directions) {
        score += evaluateDirection(board, x, y, player, dx, dy);
    }

    return score;
}

// 在单个方向上评估
function evaluateDirection(board, x, y, player, dx, dy) {
    const size = board.length;
    let count = 1;      // 相连的同色棋子数
    let blockStart = 0; // 是否一头被堵
    let blockEnd = 0;   // 是否另一头被堵

    // 往前找
    let i = x + dx;
    let j = y + dy;
    let emptyAhead = 0; // 允许中间有一个空位的特殊情况判断(如:活三)

    while (i >= 0 && i < size && j >= 0 && j < size) {
        if (board[i][j] === player) {
            count++;
        } else if (board[i][j] === 0) {
            if (emptyAhead === 0) {
                // 如果再往前还是自己的棋子？这里暂且简化
                break;
            } else {
                break;
            }
        } else {
            blockEnd = 1;
            break;
        }
        i += dx;
        j += dy;
    }

    // 如果碰到边界也算堵住了
    if (i < 0 || i >= size || j < 0 || j >= size) blockEnd = 1;

    // 往后找
    i = x - dx;
    j = y - dy;
    while (i >= 0 && i < size && j >= 0 && j < size) {
        if (board[i][j] === player) {
            count++;
        } else if (board[i][j] === 0) {
            break;
        } else {
            blockStart = 1;
            break;
        }
        i -= dx;
        j -= dy;
    }

    if (i < 0 || i >= size || j < 0 || j >= size) blockStart = 1;

    const blocks = blockStart + blockEnd;

    // 评分计算
    if (count >= 5) return SCORES.FIVE;
    if (count === 4) {
        if (blocks === 0) return SCORES.FOUR_OPEN;
        if (blocks === 1) return SCORES.FOUR_CLOSED;
    }
    if (count === 3) {
        if (blocks === 0) return SCORES.THREE_OPEN;
        if (blocks === 1) return SCORES.THREE_CLOSED;
    }
    if (count === 2) {
        if (blocks === 0) return SCORES.TWO_OPEN;
        if (blocks === 1) return SCORES.TWO_CLOSED;
    }
    if (count === 1) {
        if (blocks === 0) return SCORES.ONE_OPEN;
        if (blocks === 1) return SCORES.ONE_CLOSED;
    }

    return 0;
}
