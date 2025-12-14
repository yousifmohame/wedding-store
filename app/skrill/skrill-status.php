<?php
// skrill-status.php

// Log the incoming data for debugging
file_put_contents('skrill_ipn_log.txt', print_r($_POST, true), FILE_APPEND);

// Validate the IPN request
$merchantEmail = 'me8999109@gmail.com'; // Replace with your Skrill merchant email
$secretWord = 'your_secret_word'; // Set this in your Skrill Merchant Account settings

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $transactionId = $_POST['transaction_id'] ?? '';
    $status = $_POST['status'] ?? '';
    $amount = $_POST['amount'] ?? '';
    $currency = $_POST['currency'] ?? '';
    $payToEmail = $_POST['pay_to_email'] ?? '';
    $md5sig = $_POST['md5sig'] ?? '';

    // Verify the MD5 signature
    $expectedMd5sig = strtoupper(md5($merchantEmail . $transactionId . $amount . $currency . $status . $secretWord));
    if ($md5sig !== $expectedMd5sig) {
        file_put_contents('skrill_ipn_log.txt', "Invalid MD5 signature\n", FILE_APPEND);
        http_response_code(400);
        exit('Invalid MD5 signature');
    }

    // Process based on status
    if ($status == 2) { // Payment successful
        file_put_contents('skrill_ipn_log.txt', "Payment successful for transaction ID: $transactionId\n", FILE_APPEND);
        // Update your database to mark the order as paid
        // Example: Update order status to "paid" in your database
    } elseif ($status == -2) { // Payment failed
        file_put_contents('skrill_ipn_log.txt', "Payment failed for transaction ID: $transactionId\n", FILE_APPEND);
    } else {
        file_put_contents('skrill_ipn_log.txt', "Unknown status for transaction ID: $transactionId\n", FILE_APPEND);
    }

    // Respond to Skrill
    echo 'OK';
} else {
    http_response_code(405); // Method Not Allowed
    echo 'Invalid request method';
}
?>