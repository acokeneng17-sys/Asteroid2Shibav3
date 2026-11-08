<?php
/**
 * ASTEROID2 SHIBA ($AST2) - ALL-IN-ONE ADMIN BACKEND FOR HOSTINGER
 * Save this file at: public_html/api/admin_api.php
 */

// 1. CORS Headers - Allow access from Telegram WebApp, Hostinger, and your custom domain
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// JSON storage paths on your hosting
$dataFileWithdrawals = __DIR__ . '/withdrawals.json';
$dataFileUsers       = __DIR__ . '/users.json';
$dataFileTasks       = __DIR__ . '/tasks.json';
$dataFileReferrals   = __DIR__ . '/referrals.json';

// Initialize default files if they do not exist
if (!file_exists($dataFileWithdrawals)) {
    file_put_contents($dataFileWithdrawals, json_encode([]));
}
if (!file_exists($dataFileUsers)) {
    file_put_contents($dataFileUsers, json_encode([]));
}
if (!file_exists($dataFileReferrals)) {
    file_put_contents($dataFileReferrals, json_encode([]));
}
if (!file_exists($dataFileTasks)) {
    // Initial default social tasks
    $defaultTasks = [
        [
            "id" => "task-tiktok",
            "title" => "Ikuti TikTok Asteroid2 Shiba",
            "title_id" => "Ikuti TikTok Asteroid2 Shiba",
            "category" => "tiktok",
            "reward" => 50,
            "rewardType" => "AST2",
            "url" => "https://www.tiktok.com/@asteroid2shiba",
            "actionText" => "Ikuti",
            "description" => "Ikuti akun resmi @asteroid2shiba di TikTok • Dapatkan 50 AST2",
            "desc_id" => "Ikuti akun resmi @asteroid2shiba di TikTok • Dapatkan 50 AST2"
        ],
        [
            "id" => "task-x-follow",
            "title" => "Ikuti Akun Resmi X (Twitter)",
            "title_id" => "Ikuti Akun Resmi X (Twitter)",
            "category" => "x",
            "reward" => 50,
            "rewardType" => "AST2",
            "url" => "https://x.com/Asteroid2Shiba",
            "actionText" => "Ikuti",
            "description" => "Ikuti akun resmi @Asteroid2Shiba di platform X • Dapatkan 50 AST2",
            "desc_id" => "Ikuti akun resmi @Asteroid2Shiba di platform X • Dapatkan 50 AST2"
        ],
        [
            "id" => "task-x-repost",
            "title" => "Sukai & Repost Postingan Resmi di X",
            "title_id" => "Sukai & Repost Postingan Resmi di X",
            "category" => "x",
            "reward" => 50,
            "rewardType" => "AST2",
            "url" => "https://x.com/Asteroid2Shiba/status/2097965210137206802",
            "actionText" => "Sukai & Repost",
            "description" => "Sukai dan bagikan postingan pengumuman resmi $AST2 di X • Dapatkan 50 AST2",
            "desc_id" => "Sukai dan bagikan postingan pengumuman resmi $AST2 di X • Dapatkan 50 AST2"
        ],
        [
            "id" => "task-tg-channel",
            "title" => "Gabung Channel Resmi Telegram",
            "title_id" => "Gabung Channel Resmi Telegram",
            "category" => "telegram",
            "reward" => 100,
            "rewardType" => "AST2",
            "url" => "https://t.me/asteroid2shiba",
            "actionText" => "Gabung",
            "description" => "Gabung ke channel pengumuman Telegram resmi t.me/asteroid2shiba • Dapatkan 100 AST2",
            "desc_id" => "Gabung ke channel pengumuman Telegram resmi t.me/asteroid2shiba • Dapatkan 100 AST2"
        ],
        [
            "id" => "task-website",
            "title" => "Kunjungi Portal asteroid2shiba.com",
            "title_id" => "Kunjungi Portal asteroid2shiba.com",
            "category" => "website",
            "reward" => 50,
            "rewardType" => "AST2",
            "url" => "https://asteroid2shiba.com",
            "actionText" => "Kunjungi",
            "description" => "Buka dan jelajahi portal resmi https://asteroid2shiba.com • Dapatkan 50 AST2",
            "desc_id" => "Buka dan jelajahi portal resmi https://asteroid2shiba.com • Dapatkan 50 AST2"
        ]
    ];
    file_put_contents($dataFileTasks, json_encode($defaultTasks, JSON_PRETTY_PRINT));
}

// Parse request input
$inputRaw = file_get_contents('php://input');
$input = json_decode($inputRaw, true);
$action = $input['action'] ?? ($_GET['action'] ?? 'ping');

// 1. PING TEST CONNECTION
if ($action === 'ping') {
    echo json_encode(['status' => 'ok', 'message' => 'Hostinger API Connected & Ready!']);
    exit();
}

// 2. FETCH LATEST SOCIAL TASKS (CALLED BY TELEGRAM MINI APP)
if ($action === 'get_tasks') {
    $tasks = json_decode(file_get_contents($dataFileTasks), true) ?: [];
    echo json_encode(['status' => 'success', 'data' => $tasks]);
    exit();
}

// 3. ADMIN: SAVE / UPDATE SOCIAL TASKS
if ($action === 'save_tasks' && isset($input['tasks'])) {
    file_put_contents($dataFileTasks, json_encode($input['tasks'], JSON_PRETTY_PRINT));
    echo json_encode(['status' => 'success', 'message' => 'Social media tasks updated successfully!']);
    exit();
}

// 4. SYNC USER & REFERRAL STATS FROM MINI APP
if ($action === 'sync_user' && isset($input['data'])) {
    $users = json_decode(file_get_contents($dataFileUsers), true) ?: [];
    $incoming = $input['data'];
    $userId = $incoming['userId'] ?? 0;
    $found = false;

    foreach ($users as &$u) {
        $idMatch = ($userId && isset($u['userId']) && strval($u['userId']) === strval($userId));
        $walletMatch = (!empty($incoming['walletAddress']) && !empty($u['walletAddress']) && $u['walletAddress'] === $incoming['walletAddress']);
        $nameMatch = (!empty($incoming['userName']) && isset($u['userName']) && $u['userName'] === $incoming['userName']);

        if ($idMatch || $walletMatch || $nameMatch) {
            $u['balance'] = isset($incoming['balance']) ? $incoming['balance'] : ($u['balance'] ?? 0);
            $u['totalEarned'] = isset($incoming['totalEarned']) ? $incoming['totalEarned'] : ($u['totalEarned'] ?? 0);
            $u['referralCount'] = isset($incoming['referralCount']) ? $incoming['referralCount'] : ($u['referralCount'] ?? 0);
            $u['boostLevel'] = isset($incoming['boostLevel']) ? $incoming['boostLevel'] : ($u['boostLevel'] ?? 1);
            if (!empty($incoming['walletAddress'])) {
                $u['walletAddress'] = $incoming['walletAddress'];
            }
            if (!empty($incoming['userName'])) {
                $u['userName'] = $incoming['userName'];
            }
            if (!empty($incoming['invitedBy'])) {
                $u['invitedBy'] = $incoming['invitedBy'];
            }
            if (!empty($incoming['inviterCode'])) {
                $u['inviterCode'] = $incoming['inviterCode'];
            }
            if (!empty($incoming['referralCode'])) {
                $u['referralCode'] = $incoming['referralCode'];
            }
            $u['last_active'] = date('Y-m-d H:i:s');
            $found = true;
            break;
        }
    }

    if (!$found) {
        $incoming['registered_at'] = date('Y-m-d H:i:s');
        $incoming['last_active'] = date('Y-m-d H:i:s');
        array_unshift($users, $incoming);
    }

    file_put_contents($dataFileUsers, json_encode($users, JSON_PRETTY_PRINT));
    echo json_encode(['status' => 'success', 'message' => 'User stats recorded']);
    exit();
}

// 5. MINI APP: RECORD NEW WITHDRAWAL REQUEST
if ($action === 'new_withdrawal' && isset($input['data'])) {
    $existing = json_decode(file_get_contents($dataFileWithdrawals), true) ?: [];
    $item = $input['data'];
    $item['received_at'] = date('Y-m-d H:i:s');
    array_unshift($existing, $item);
    file_put_contents($dataFileWithdrawals, json_encode($existing, JSON_PRETTY_PRINT));
    echo json_encode(['status' => 'success', 'message' => 'Withdrawal recorded successfully on Hostinger!']);
    exit();
}

// 6. ADMIN DASHBOARD: FETCH ALL DATA (OVERVIEW, WITHDRAWALS, USERS, TASKS, REFERRALS)
if ($action === 'get_all_admin_data') {
    $withdrawals = json_decode(file_get_contents($dataFileWithdrawals), true) ?: [];
    $users = json_decode(file_get_contents($dataFileUsers), true) ?: [];
    $tasks = json_decode(file_get_contents($dataFileTasks), true) ?: [];
    $referrals = json_decode(file_get_contents($dataFileReferrals), true) ?: [];

    echo json_encode([
        'status' => 'success',
        'data' => [
            'withdrawals' => $withdrawals,
            'users' => $users,
            'tasks' => $tasks,
            'referrals' => $referrals
        ],
        'withdrawals' => $withdrawals,
        'users' => $users,
        'tasks' => $tasks,
        'referrals' => $referrals
    ]);
    exit();
}

// 7. ADMIN: UPDATE WITHDRAWAL STATUS (APPROVE / REJECT)
if ($action === 'update_status' && isset($input['id']) && isset($input['status'])) {
    $existing = json_decode(file_get_contents($dataFileWithdrawals), true) ?: [];
    foreach ($existing as &$row) {
        if ($row['id'] == $input['id']) {
            $row['status'] = $input['status'];
            break;
        }
    }
    file_put_contents($dataFileWithdrawals, json_encode($existing, JSON_PRETTY_PRINT));
    echo json_encode(['status' => 'success', 'message' => 'Withdrawal status updated successfully!']);
    exit();
}

// 8. RECORD INCOMING REFERRAL (INVITED USER JOINS VIA REF LINK)
if ($action === 'register_referral') {
    $refCode = trim($input['referrer_code'] ?? ($_GET['referrer_code'] ?? ''));
    $invitedId = trim(strval($input['invited_user_id'] ?? ($_GET['invited_user_id'] ?? '')));
    $invitedUser = trim($input['invited_username'] ?? ($_GET['invited_username'] ?? ''));
    $invitedName = trim($input['invited_first_name'] ?? ($_GET['invited_first_name'] ?? ''));
    $reward = intval($input['reward_amount'] ?? 50);

    if (empty($refCode)) {
        echo json_encode(['status' => 'error', 'message' => 'Missing referrer code']);
        exit();
    }

    $referrals = json_decode(file_get_contents($dataFileReferrals), true) ?: [];
    
    // Check if this invited user was already credited under this referrer to avoid duplicates
    $alreadyExists = false;
    foreach ($referrals as $item) {
        if ($item['referrer_code'] === $refCode && !empty($invitedId) && isset($item['invited_user_id']) && strval($item['invited_user_id']) === strval($invitedId)) {
            $alreadyExists = true;
            break;
        }
    }

    if (!$alreadyExists) {
        if (!empty($invitedUser)) {
            $displayUsername = '@' . ltrim($invitedUser, '@');
        } elseif (!empty($invitedName)) {
            $displayUsername = $invitedName;
        } elseif (!empty($invitedId)) {
            $displayUsername = 'Pilot #' . substr($invitedId, -4);
        } else {
            $displayUsername = 'Pilot Shiba (Guest)';
        }

        $newItem = [
            'id' => 'ref-' . time() . '-' . rand(100, 999),
            'referrer_code' => $refCode,
            'invited_user_id' => $invitedId,
            'username' => $displayUsername,
            'reward' => $reward,
            'joinedDate' => date('Y-m-d H:i:s'),
            'timestamp' => time()
        ];
        array_unshift($referrals, $newItem);
        file_put_contents($dataFileReferrals, json_encode($referrals, JSON_PRETTY_PRINT));

        // Also credit referrer's user balance in users.json if exists
        $users = json_decode(file_get_contents($dataFileUsers), true) ?: [];
        $cleanRefId = preg_replace('/[^0-9]/', '', $refCode);
        foreach ($users as &$u) {
            $matched = false;
            if (!empty($cleanRefId) && isset($u['userId']) && strval($u['userId']) === strval($cleanRefId)) {
                $matched = true;
            } elseif (isset($u['userName']) && (strcasecmp($u['userName'], $refCode) === 0 || strcasecmp('@' . $u['userName'], $refCode) === 0)) {
                $matched = true;
            }
            if ($matched) {
                $u['balance'] = ($u['balance'] ?? 0) + $reward;
                $u['totalEarned'] = ($u['totalEarned'] ?? 0) + $reward;
                $u['referralCount'] = ($u['referralCount'] ?? 0) + 1;
                $u['last_active'] = date('Y-m-d H:i:s');
                break;
            }
        }
        file_put_contents($dataFileUsers, json_encode($users, JSON_PRETTY_PRINT));
    }

    echo json_encode(['status' => 'success', 'message' => 'Referral processed successfully', 'already_existed' => $alreadyExists]);
    exit();
}

// 8B. FETCH ALL REFERRALS DIRECTLY
if ($action === 'get_all_referrals' || $action === 'fetch_referrals') {
    $referrals = json_decode(file_get_contents($dataFileReferrals), true) ?: [];
    echo json_encode([
        'status' => 'success',
        'referrals' => $referrals,
        'total' => count($referrals)
    ]);
    exit();
}

// 9. FETCH REFERRALS FOR CURRENT USER (CALLED BY MINI APP TO CLAIM REWARDS)
if ($action === 'get_my_referrals') {
    $refCode = trim($input['referrer_code'] ?? ($_GET['referrer_code'] ?? ''));
    $userId = trim($input['user_id'] ?? ($_GET['user_id'] ?? ''));

    $referrals = json_decode(file_get_contents($dataFileReferrals), true) ?: [];
    $myList = [];
    $totalBonus = 0;

    $possibleCodes = [];
    if (!empty($refCode)) {
        $possibleCodes[] = strtolower($refCode);
        $clean = preg_replace('/[^0-9]/', '', $refCode);
        if (!empty($clean)) $possibleCodes[] = 'ast-' . $clean;
    }
    if (!empty($userId)) {
        $possibleCodes[] = 'ast-' . strtolower($userId);
        $possibleCodes[] = strtolower($userId);
    }

    foreach ($referrals as $r) {
        $rCode = strtolower($r['referrer_code'] ?? '');
        $matched = false;
        foreach ($possibleCodes as $c) {
            if ($rCode === $c || (!empty($c) && strpos($rCode, $c) !== false)) {
                $matched = true;
                break;
            }
        }
        if ($matched) {
            $myList[] = [
                'id' => $r['id'],
                'username' => $r['username'] ?? 'Friend',
                'joinedDate' => $r['joinedDate'] ?? 'Recently',
                'reward' => intval($r['reward'] ?? 50),
            ];
            $totalBonus += intval($r['reward'] ?? 50);
        }
    }

    // Also scan users.json for users invited by this player
    $users = json_decode(file_get_contents($dataFileUsers), true) ?: [];
    foreach ($users as $u) {
        $inviter = strtolower($u['invitedBy'] ?? ($u['inviterCode'] ?? ''));
        if (!empty($inviter)) {
            $matched = false;
            foreach ($possibleCodes as $c) {
                if ($inviter === $c || strpos($inviter, $c) !== false) {
                    $matched = true;
                    break;
                }
            }
            if ($matched) {
                $uid = 'ref-u-' . ($u['userId'] ?? ($u['userName'] ?? rand(100, 999)));
                $alreadyInList = false;
                foreach ($myList as $item) {
                    if ($item['id'] === $uid) {
                        $alreadyInList = true;
                        break;
                    }
                }
                if (!$alreadyInList) {
                    $myList[] = [
                        'id' => $uid,
                        'username' => $u['userName'] ?? 'Friend',
                        'joinedDate' => $u['registered_at'] ?? 'Recently',
                        'reward' => 50,
                    ];
                    $totalBonus += 50;
                }
            }
        }
    }

    echo json_encode([
        'status' => 'success',
        'referrals' => $myList,
        'total_bonus' => $totalBonus,
        'count' => count($myList)
    ]);
    exit();
}

// 10. FETCH WITHDRAWALS FOR SPECIFIC USER (CALLED BY MINI APP TO SYNC APPROVAL STATUS)
if ($action === 'get_user_withdrawals' || $action === 'get_my_withdrawals') {
    $userId = trim(strval($input['user_id'] ?? ($_GET['user_id'] ?? '')));
    $wallet = strtolower(trim(strval($input['wallet_address'] ?? ($_GET['wallet_address'] ?? ''))));

    $withdrawals = json_decode(file_get_contents($dataFileWithdrawals), true) ?: [];
    $myWithdrawals = [];

    foreach ($withdrawals as $w) {
        $wUserId = trim(strval($w['userId'] ?? ($w['user_id'] ?? '')));
        $wWallet = strtolower(trim(strval($w['walletAddress'] ?? ($w['wallet_address'] ?? ''))));

        $matched = false;
        if (!empty($userId) && $wUserId === $userId) {
            $matched = true;
        } elseif (!empty($wallet) && $wWallet === $wallet) {
            $matched = true;
        }

        if ($matched) {
            $myWithdrawals[] = $w;
        }
    }

    echo json_encode([
        'status' => 'success',
        'withdrawals' => $myWithdrawals,
        'count' => count($myWithdrawals)
    ]);
    exit();
}

echo json_encode(['status' => 'error', 'message' => 'Unknown action']);
