
// RISKSHIELD AI - FRONTEND APPLICATION


const API_URL = "https://riskshield-ai-api.onrender.com";


let transactions = [];

let currentTransaction = null;

let currentInvestigation = null;



function getElement(id) {
    return document.getElementById(id);
}


function setText(id, value) {
    const element = getElement(id);

    if (element) {
        element.textContent = value;
    }
}


function escapeHTML(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}



document.addEventListener("DOMContentLoaded", () => {

    initializeSidebar();

    initializeModalHandlers();

    updateDashboardStats();

    updateAlertCount();

    renderTransactionHistory();

});



function initializeSidebar() {

    const navItems =
        document.querySelectorAll(
            "#sidebarNav .nav-item"
        );


    navItems.forEach(item => {

        item.addEventListener("click", event => {

            event.preventDefault();

            const page =
                item.dataset.page;

            if (page) {

                navigateToPage(page);

            }

        });

    });

}


function navigateToPage(page) {

    const navItems =
        document.querySelectorAll(
            "#sidebarNav .nav-item"
        );


    navItems.forEach(item => {

        item.classList.remove("active");

    });


    const selected =
        document.querySelector(
            `#sidebarNav .nav-item[data-page="${page}"]`
        );


    if (selected) {

        selected.classList.add("active");

    }


    if (page === "dashboard") {

        showDashboard();

        return;

    }


    showSidebarPage(page);

}


function showDashboard() {

    const stats =
        getElement("dashboardStats");

    const workspace =
        getElement("riskWorkspace");

    const reasons =
        getElement("reasonsSection");

    const history =
        getElement("historySection");

    const pageView =
        getElement("sidebarPageView");


    if (stats) {

        stats.style.display = "";

    }


    if (workspace) {

        workspace.style.display = "";

    }


    if (reasons) {

        reasons.style.display = "";

    }


    if (history) {

        history.style.display = "";

    }


    if (pageView) {

        pageView.style.display = "none";

    }


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


function showSidebarPage(page) {

    const stats =
        getElement("dashboardStats");

    const workspace =
        getElement("riskWorkspace");

    const reasons =
        getElement("reasonsSection");

    const history =
        getElement("historySection");

    const pageView =
        getElement("sidebarPageView");


    if (stats) {

        stats.style.display = "none";

    }


    if (workspace) {

        workspace.style.display = "none";

    }


    if (reasons) {

        reasons.style.display = "none";

    }


    if (history) {

        history.style.display = "none";

    }


    if (!pageView) {

        console.warn(
            "sidebarPageView not found in index.html"
        );

        return;

    }


    pageView.style.display = "";


    switch (page) {

        case "transactions":

            renderTransactionsPage();

            break;


        case "alerts":

            renderAlertsPage();

            break;


        case "risk-engine":

            renderRiskEnginePage();

            break;


        case "analytics":

            renderAnalyticsPage();

            break;


        case "investigations":

            renderInvestigationsPage();

            break;


        case "reports":

            renderReportsPage();

            break;


        case "model-monitor":

            renderModelMonitorPage();

            break;


        default:

            renderTransactionsPage();

    }


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


async function analyzeTransaction() {

    const recipientInput =
        getElement("recipient");

    const typeInput =
        getElement("transactionType");

    const amountInput =
        getElement("amount");

    const error =
        getElement("error");

    const button =
        getElement("analyzeButton");

    const buttonText =
        getElement("buttonText");


    const recipient =
        recipientInput
            ? recipientInput.value.trim()
            : "";


    const transactionType =
        typeInput
            ? typeInput.value
            : "UPI";


    const amount =
        amountInput
            ? Number(amountInput.value)
            : 0;


    // Clear previous error

    if (error) {

        error.textContent = "";

    }


    // Validation

    if (!recipient) {

        if (error) {

            error.textContent =
                "Enter a recipient.";

        }

        return;

    }


    if (!amount || amount <= 0) {

        if (error) {

            error.textContent =
                "Enter a valid transaction amount.";

        }

        return;

    }


    // Loading state

    if (button) {

        button.disabled = true;

    }


    if (buttonText) {

        buttonText.textContent =
            "ANALYZING...";

    }


    try {

        const response =
            await fetch(
                `${API_URL}/predict`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        recipient:
                            recipient,

                        transaction_amount:
                            amount,

                        transaction_type:
                            transactionType

                    })
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.detail ||
                "Prediction failed."
            );

        }

        updateRiskDashboard(
            data
        );


        const transaction = {

            id:
                Date.now(),

            recipient:
                recipient,

            type:
                transactionType,

            amount:
                amount,

            fraudProbability:
                Number(
                    data.fraud_probability
                ),

            riskScore:
                Number(
                    data.risk_score
                ),

            riskLevel:
                data.risk_level,

            action:
                data.recommended_action,

            reasons:
                Array.isArray(data.reasons)
                    ? data.reasons
                    : [],

            timestamp:
                new Date().toISOString()

        };


        const duplicate =
            transactions.some(
                existing =>

                    existing.recipient ===
                        transaction.recipient &&

                    existing.type ===
                        transaction.type &&

                    Number(existing.amount) ===
                        Number(transaction.amount) &&

                    Number(existing.riskScore) ===
                        Number(transaction.riskScore)
            );


        if (!duplicate) {

            transactions.unshift(
                transaction
            );

        }


        // Current transaction

        currentTransaction =
            transaction;



        updateDashboardStats();

        updateAlertCount();

        renderTransactionHistory();


        if (
            data.risk_level === "CRITICAL" ||
            data.risk_level === "HIGH"
        ) {

            showRiskAlert(
                transaction
            );

        }


    } catch (err) {

        console.error(
            "RiskShield prediction error:",
            err
        );


        if (error) {

            error.textContent =
                err.message ||
                "Unable to connect to RiskShield API.";

        }

    } finally {

        if (button) {

            button.disabled = false;

        }


        if (buttonText) {

            buttonText.textContent =
                "ANALYZE TRANSACTION";

        }

    }

}


function updateRiskDashboard(data) {

    const score =
        Number(data.risk_score || 0);


    const probability =
        Number(
            data.fraud_probability || 0
        );


    const level =
        String(
            data.risk_level || "LOW"
        ).toUpperCase();


    const action =
        String(
            data.recommended_action ||
            "ALLOW"
        ).toUpperCase();


    setText(
        "orbScore",
        score.toFixed(2)
    );


    setText(
        "riskScore",
        `${score.toFixed(2)}/100`
    );


    setText(
        "fraudProbability",
        `${(probability * 100).toFixed(1)}%`
    );


    setText(
        "riskLevel",
        level
    );


    setText(
        "action",
        action
    );


    // Decision icon

    let icon = "✓";

    if (action === "REVIEW") {

        icon = "⚠";

    }

    if (action === "BLOCK") {

        icon = "⛔";

    }


    setText(
        "decisionIcon",
        icon
    );


    // Decision message

    let message =
        "Transaction approved by RiskShield AI.";


    if (action === "REVIEW") {

        message =
            "Transaction requires manual review.";

    }


    if (action === "BLOCK") {

        message =
            "Transaction blocked due to critical risk.";

    }


    setText(
        "decisionText",
        message
    );


    const reasonsElement =
        getElement("reasons");


    if (reasonsElement) {

        reasonsElement.innerHTML = "";


        const reasons =
            Array.isArray(data.reasons)
                ? data.reasons
                : [];


        if (!reasons.length) {

            reasonsElement.innerHTML = `

                <div class="empty-reason">

                    No significant risk indicators detected.

                </div>

            `;

        } else {

            reasons.forEach(reason => {

                const item =
                    document.createElement("div");

                item.className =
                    "reason-item";


                item.textContent =
                    reason;


                reasonsElement.appendChild(
                    item
                );

            });

        }

    }

}



function showRiskAlert(transaction) {

    currentTransaction =
        transaction;


    setText(
        "alertRecipient",
        transaction.recipient || "--"
    );


    setText(
        "alertAmount",
        Number(
            transaction.amount || 0
        ).toLocaleString("en-IN")
    );


    setText(
        "alertScore",
        `${Number(
            transaction.riskScore || 0
        ).toFixed(2)}/100`
    );


    setText(
        "alertProbability",
        `${(
            Number(
                transaction.fraudProbability || 0
            ) * 100
        ).toFixed(1)}%`
    );


    let message =
        "Suspicious transaction detected.";


    if (
        transaction.riskLevel ===
        "CRITICAL"
    ) {

        message =
            "Critical risk transaction detected. Immediate action recommended.";

    } else if (
        transaction.riskLevel ===
        "HIGH"
    ) {

        message =
            "High-risk transaction requires review.";

    }


    setText(
        "alertMessage",
        message
    );


    const reasons =
        getElement("alertReasons");


    if (reasons) {

        reasons.innerHTML = "";


        transaction.reasons.forEach(
            reason => {

                const item =
                    document.createElement("div");

                item.textContent =
                    `• ${reason}`;

                reasons.appendChild(
                    item
                );

            }
        );

    }


    const modal =
        getElement("alertModal");


    if (modal) {

        modal.style.display = "flex";

        modal.classList.add("show");

    }

}


function closeAlert() {

    const modal =
        getElement("alertModal");


    if (modal) {

        modal.classList.remove("show");

        modal.style.display = "none";

    }

}



function blockTransaction() {

    if (!currentTransaction) {

        closeAlert();

        return;

    }


    currentTransaction.action =
        "BLOCK";


    currentTransaction.status =
        "BLOCKED";


    updateTransactionInArray(
        currentTransaction
    );


    updateDashboardStats();

    updateAlertCount();

    renderTransactionHistory();


    closeAlert();


    // IMPORTANT:
    // This is a demo/frontend decision.
    // It does NOT block a real bank transaction.

    showActionToast(
        "Transaction marked as BLOCKED."
    );

}


function reviewTransaction() {

    if (!currentTransaction) {

        closeAlert();

        return;

    }


    currentTransaction.action =
        "REVIEW";


    currentTransaction.status =
        "UNDER_REVIEW";


    updateTransactionInArray(
        currentTransaction
    );


    updateDashboardStats();

    updateAlertCount();

    renderTransactionHistory();


    closeAlert();


    showActionToast(
        "Transaction moved to REVIEW."
    );

}


function updateTransactionInArray(transaction) {

    const index =
        transactions.findIndex(
            item =>
                item.id ===
                transaction.id
        );


    if (index !== -1) {

        transactions[index] =
            transaction;

    }

}


function renderTransactionHistory() {

    const table =
        getElement(
            "transactionHistory"
        );


    if (!table) {

        return;

    }


    table.innerHTML = "";


    if (!transactions.length) {

        table.innerHTML = `

            <tr>

                <td
                    colspan="6"
                    class="empty-table"
                >

                    No transactions analyzed yet.

                </td>

            </tr>

        `;

        return;

    }


    transactions.forEach(
        (transaction, index) => {

            const row =
                document.createElement("tr");


            row.style.cursor =
                "pointer";


            row.innerHTML = `

                <td>
                    ${escapeHTML(
                        transaction.recipient
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        transaction.type
                    )}
                </td>

                <td>
                    ₹${Number(
                        transaction.amount
                    ).toLocaleString("en-IN")}
                </td>

                <td>
                    ${Number(
                        transaction.riskScore
                    ).toFixed(2)}
                </td>

                <td>
                    ${escapeHTML(
                        transaction.riskLevel
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        transaction.action
                    )}
                </td>

            `;


            row.addEventListener(
                "click",
                () => {

                    openInvestigation(
                        index
                    );

                }
            );


            table.appendChild(row);

        }
    );

}




function clearHistory() {

    transactions = [];

    currentTransaction = null;

    currentInvestigation = null;


    updateDashboardStats();

    updateAlertCount();

    renderTransactionHistory();


    showActionToast(
        "Transaction history cleared."
    );

}



function updateDashboardStats() {

    const total =
        transactions.length;


    const highRisk =
        transactions.filter(
            transaction =>

                transaction.riskLevel ===
                    "HIGH" ||

                transaction.riskLevel ===
                    "CRITICAL"
        ).length;


    const blocked =
        transactions.filter(
            transaction =>

                transaction.action ===
                    "BLOCK" ||

                transaction.status ===
                    "BLOCKED"
        ).length;


    setText(
        "totalTransactions",
        total
    );


    setText(
        "highRisk",
        highRisk
    );


    setText(
        "blockedTransactions",
        blocked
    );

}




function updateAlertCount() {

    const count =
        transactions.filter(
            transaction =>

                transaction.riskLevel ===
                    "HIGH" ||

                transaction.riskLevel ===
                    "CRITICAL"
        ).length;


    setText(
        "alertCount",
        count
    );

}



function openInvestigation(index) {

    const transaction =
        transactions[index];


    if (!transaction) {

        return;

    }


    currentInvestigation =
        transaction;


    setText(
        "investigationRecipient",
        transaction.recipient || "--"
    );


    setText(
        "investigationType",
        transaction.type || "--"
    );


    setText(
        "investigationAmount",
        `₹${Number(
            transaction.amount || 0
        ).toLocaleString("en-IN")}`
    );


    setText(
        "investigationScore",
        `${Number(
            transaction.riskScore || 0
        ).toFixed(2)}/100`
    );


    setText(
        "investigationProbability",
        `${(
            Number(
                transaction.fraudProbability || 0
            ) * 100
        ).toFixed(1)}%`
    );


    setText(
        "investigationLevel",
        transaction.riskLevel || "LOW"
    );


    setText(
        "investigationAction",
        transaction.action || "ALLOW"
    );


    const reasons =
        getElement(
            "investigationReasons"
        );


    if (reasons) {

        reasons.innerHTML = "";


        const list =
            transaction.reasons || [];


        if (!list.length) {

            reasons.innerHTML =
                "<li>No significant risk indicators detected.</li>";

        } else {

            list.forEach(reason => {

                const li =
                    document.createElement("li");

                li.textContent =
                    reason;

                reasons.appendChild(li);

            });

        }

    }


    const modal =
        getElement(
            "investigationModal"
        );


    if (modal) {

        modal.classList.add("show");

    }

}


function closeInvestigation() {

    const modal =
        getElement(
            "investigationModal"
        );


    if (modal) {

        modal.classList.remove("show");

    }


    currentInvestigation =
        null;

}


function investigationAction(action) {

    if (!currentInvestigation) {

        return;

    }


    currentInvestigation.action =
        action;


    if (action === "BLOCK") {

        currentInvestigation.status =
            "BLOCKED";

    } else if (action === "REVIEW") {

        currentInvestigation.status =
            "UNDER_REVIEW";

    } else {

        currentInvestigation.status =
            "ALLOWED";

    }


    updateTransactionInArray(
        currentInvestigation
    );


    updateDashboardStats();

    updateAlertCount();

    renderTransactionHistory();


    closeInvestigation();


    showActionToast(
        `Transaction marked as ${action}.`
    );

}



function renderTransactionsPage() {

    const page =
        getElement("sidebarPageView");


    if (!page) return;


    page.innerHTML = `

        <div class="page-view-header">

            <div>

                <span class="panel-label">
                    ACTIVITY CENTER
                </span>

                <h2>Transactions</h2>

                <p>
                    Monitor transactions analyzed
                    by RiskShield AI.
                </p>

            </div>

            <strong>
                ${transactions.length} Transactions
            </strong>

        </div>


        <div class="info-grid">

            <div class="info-box">

                <span>TOTAL ANALYZED</span>

                <strong>
                    ${transactions.length}
                </strong>

            </div>


            <div class="info-box">

                <span>HIGH RISK</span>

                <strong>
                    ${getHighRiskCount()}
                </strong>

            </div>


            <div class="info-box">

                <span>BLOCKED</span>

                <strong>
                    ${getBlockedCount()}
                </strong>

            </div>

        </div>


        <br>


        <div class="table-container">

            <table>

                <thead>

                    <tr>

                        <th>RECIPIENT</th>
                        <th>TYPE</th>
                        <th>AMOUNT</th>
                        <th>RISK</th>
                        <th>LEVEL</th>
                        <th>ACTION</th>

                    </tr>

                </thead>


                <tbody>

                    ${
                        transactions.length

                        ?

                        transactions.map(
                            transaction =>
                                createTransactionRow(
                                    transaction
                                )
                        ).join("")

                        :

                        `
                        <tr>

                            <td colspan="6">

                                No transactions analyzed yet.

                            </td>

                        </tr>
                        `
                    }

                </tbody>

            </table>

        </div>

    `;


    // Add click handlers

    const rows =
        page.querySelectorAll(
            "tbody tr[data-index]"
        );


    rows.forEach(row => {

        row.addEventListener(
            "click",
            () => {

                openInvestigation(
                    Number(
                        row.dataset.index
                    )
                );

            }
        );

    });

}


function createTransactionRow(
    transaction
) {

    const index =
        transactions.indexOf(
            transaction
        );


    return `

        <tr
            data-index="${index}"
            style="cursor:pointer;"
        >

            <td>
                ${escapeHTML(
                    transaction.recipient
                )}
            </td>

            <td>
                ${escapeHTML(
                    transaction.type
                )}
            </td>

            <td>
                ₹${Number(
                    transaction.amount
                ).toLocaleString("en-IN")}
            </td>

            <td>
                ${Number(
                    transaction.riskScore
                ).toFixed(2)}
            </td>

            <td>
                ${escapeHTML(
                    transaction.riskLevel
                )}
            </td>

            <td>
                ${escapeHTML(
                    transaction.action
                )}
            </td>

        </tr>

    `;

}



function renderAlertsPage() {

    const page =
        getElement("sidebarPageView");


    if (!page) return;


    const alerts =
        transactions.filter(
            transaction =>

                transaction.riskLevel ===
                    "HIGH" ||

                transaction.riskLevel ===
                    "CRITICAL"
        );


    page.innerHTML = `

        <div class="page-view-header">

            <div>

                <span class="panel-label">
                    SECURITY ALERTS
                </span>

                <h2>Alerts</h2>

                <p>
                    High-risk transactions requiring
                    attention.
                </p>

            </div>

            <strong>
                ${alerts.length} Active Alerts
            </strong>

        </div>


        ${
            alerts.length

            ?

            alerts.map(
                transaction => {

                    const index =
                        transactions.indexOf(
                            transaction
                        );


                    return `

                        <div
                            class="investigation-item"
                            data-index="${index}"
                            style="cursor:pointer;"
                        >

                            <strong>

                                ${escapeHTML(
                                    transaction.action
                                )}

                                —

                                ${escapeHTML(
                                    transaction.riskLevel
                                )}

                            </strong>


                            <div class="investigation-meta">

                                ${escapeHTML(
                                    transaction.recipient
                                )}

                                &nbsp; • &nbsp;

                                ₹${Number(
                                    transaction.amount
                                ).toLocaleString("en-IN")}

                                &nbsp; • &nbsp;

                                Risk ${Number(
                                    transaction.riskScore
                                ).toFixed(2)}

                            </div>

                        </div>

                    `;

                }
            ).join("")

            :

            `
                <div class="empty-reason">

                    No high-risk alerts detected.

                </div>
            `
        }

    `;


    page
        .querySelectorAll(
            ".investigation-item[data-index]"
        )
        .forEach(item => {

            item.addEventListener(
                "click",
                () => {

                    openInvestigation(
                        Number(
                            item.dataset.index
                        )
                    );

                }
            );

        });

}


function renderRiskEnginePage() {

    const page =
        getElement("sidebarPageView");


    if (!page) return;


    page.innerHTML = `

        <div class="page-view-header">

            <div>

                <span class="panel-label">
                    AI RISK ENGINE
                </span>

                <h2>Risk Engine</h2>

                <p>
                    Real-time transaction risk
                    evaluation and decisioning.
                </p>

            </div>

            <span class="ai-status">
                ● AI ONLINE
            </span>

        </div>


        <div class="info-grid">

            <div class="info-box">

                <span>MODEL</span>

                <strong>
                    XGBoost V2.1
                </strong>

            </div>


            <div class="info-box">

                <span>FEATURES</span>

                <strong>
                    450
                </strong>

            </div>


            <div class="info-box">

                <span>DECISION ENGINE</span>

                <strong>
                    ALLOW / REVIEW / BLOCK
                </strong>

            </div>

        </div>


        <br>


        <div class="panel">

            <span class="panel-label">
                PIPELINE
            </span>

            <h2>
                Transaction → ML → Risk Engine → Decision
            </h2>

            <p>

                The XGBoost model generates fraud
                probability. RiskShield then combines
                it with transaction-level signals such
                as amount and transaction type.

            </p>

        </div>

    `;

}




function renderAnalyticsPage() {

    const page =
        getElement("sidebarPageView");


    if (!page) return;


    const low =
        transactions.filter(
            t => t.riskLevel === "LOW"
        ).length;


    const medium =
        transactions.filter(
            t => t.riskLevel === "MEDIUM"
        ).length;


    const high =
        transactions.filter(
            t => t.riskLevel === "HIGH"
        ).length;


    const critical =
        transactions.filter(
            t => t.riskLevel === "CRITICAL"
        ).length;


    page.innerHTML = `

        <div class="page-view-header">

            <div>

                <span class="panel-label">
                    RISK ANALYTICS
                </span>

                <h2>Analytics</h2>

                <p>
                    Current transaction risk distribution.
                </p>

            </div>

        </div>


        <div class="info-grid">

            <div class="info-box">

                <span>TOTAL</span>

                <strong>
                    ${transactions.length}
                </strong>

            </div>


            <div class="info-box">

                <span>LOW</span>

                <strong>
                    ${low}
                </strong>

            </div>


            <div class="info-box">

                <span>MEDIUM</span>

                <strong>
                    ${medium}
                </strong>

            </div>


            <div class="info-box">

                <span>HIGH</span>

                <strong>
                    ${high}
                </strong>

            </div>


            <div class="info-box">

                <span>CRITICAL</span>

                <strong>
                    ${critical}
                </strong>

            </div>

        </div>

    `;

}




function renderInvestigationsPage() {

    const page =
        getElement("sidebarPageView");


    if (!page) return;


    const investigations =
        transactions.filter(
            transaction =>

                transaction.riskLevel ===
                    "HIGH" ||

                transaction.riskLevel ===
                    "CRITICAL"
        );


    page.innerHTML = `

        <div class="page-view-header">

            <div>

                <span class="panel-label">
                    FRAUD OPERATIONS
                </span>

                <h2>Investigations</h2>

                <p>
                    Review transactions flagged by
                    the RiskShield decision engine.
                </p>

            </div>

            <strong>
                ${investigations.length} Cases
            </strong>

        </div>


        ${
            investigations.length

            ?

            investigations.map(
                transaction => {

                    const index =
                        transactions.indexOf(
                            transaction
                        );


                    return `

                        <div
                            class="investigation-item"
                            data-index="${index}"
                            style="cursor:pointer;"
                        >

                            <strong>

                                ${escapeHTML(
                                    transaction.riskLevel
                                )}

                                —

                                ₹${Number(
                                    transaction.amount
                                ).toLocaleString("en-IN")}

                            </strong>


                            <div class="investigation-meta">

                                Recipient:
                                ${escapeHTML(
                                    transaction.recipient
                                )}

                                <br>

                                Type:
                                ${escapeHTML(
                                    transaction.type
                                )}

                                <br>

                                Risk Score:
                                ${Number(
                                    transaction.riskScore
                                ).toFixed(2)}

                                <br>

                                Decision:
                                ${escapeHTML(
                                    transaction.action
                                )}

                            </div>

                        </div>

                    `;

                }
            ).join("")

            :

            `
                <div class="empty-reason">

                    No investigation cases currently available.

                </div>
            `
        }

    `;


    page
        .querySelectorAll(
            ".investigation-item[data-index]"
        )
        .forEach(item => {

            item.addEventListener(
                "click",
                () => {

                    openInvestigation(
                        Number(
                            item.dataset.index
                        )
                    );

                }
            );

        });

}




function renderReportsPage() {

    const page =
        getElement("sidebarPageView");


    if (!page) return;


    page.innerHTML = `

        <div class="page-view-header">

            <div>

                <span class="panel-label">
                    RISK REPORTING
                </span>

                <h2>Reports</h2>

                <p>
                    Generate a summary of the current
                    RiskShield monitoring session.
                </p>

            </div>


            <button
                class="report-button"
                id="generateReportButton"
            >
                Generate Report
            </button>

        </div>


        <div class="info-grid">

            <div class="info-box">

                <span>TRANSACTIONS</span>

                <strong>
                    ${transactions.length}
                </strong>

            </div>


            <div class="info-box">

                <span>HIGH RISK</span>

                <strong>
                    ${getHighRiskCount()}
                </strong>

            </div>


            <div class="info-box">

                <span>BLOCKED</span>

                <strong>
                    ${getBlockedCount()}
                </strong>

            </div>

        </div>

    `;


    const button =
        getElement(
            "generateReportButton"
        );


    if (button) {

        button.addEventListener(
            "click",
            generateRiskReport
        );

    }

}




function renderModelMonitorPage() {

    const page =
        getElement("sidebarPageView");


    if (!page) return;


    page.innerHTML = `

        <div class="page-view-header">

            <div>

                <span class="panel-label">
                    MODEL OPERATIONS
                </span>

                <h2>Model Monitor</h2>

                <p>
                    Monitor the currently deployed
                    fraud detection model.
                </p>

            </div>

            <span class="ai-status">
                ● ONLINE
            </span>

        </div>


        <div class="info-grid">

            <div class="info-box">

                <span>MODEL</span>

                <strong>
                    XGBoost
                </strong>

            </div>


            <div class="info-box">

                <span>VERSION</span>

                <strong>
                    V2.1
                </strong>

            </div>


            <div class="info-box">

                <span>FEATURES</span>

                <strong>
                    450
                </strong>

            </div>


            <div class="info-box">

                <span>STATUS</span>

                <strong>
                    Healthy
                </strong>

            </div>

        </div>


        <br>


        <div class="panel">

            <span class="panel-label">
                MODEL PIPELINE
            </span>

            <h2>
                XGBoost Fraud Detection
            </h2>

            <p>

                The deployed model generates a fraud
                probability which is passed to the
                RiskShield scoring engine for final
                decisioning.

            </p>

        </div>

    `;

}




function generateRiskReport() {

    const report = {

        product:
            "RiskShield AI",

        model:
            "XGBoost V2.1",

        features:
            450,

        generatedAt:
            new Date().toLocaleString(),

        totalTransactions:
            transactions.length,

        highRisk:
            getHighRiskCount(),

        blocked:
            getBlockedCount(),

        transactions:
            transactions

    };


    const blob =
        new Blob(
            [
                JSON.stringify(
                    report,
                    null,
                    2
                )
            ],
            {
                type:
                    "application/json"
            }
        );


    const url =
        URL.createObjectURL(blob);


    const link =
        document.createElement("a");


    link.href =
        url;


    link.download =
        `riskshield-report-${Date.now()}.json`;


    document.body.appendChild(link);

    link.click();

    link.remove();


    URL.revokeObjectURL(url);


    showActionToast(
        "Risk report generated."
    );

}



function getHighRiskCount() {

    return transactions.filter(
        transaction =>

            transaction.riskLevel ===
                "HIGH" ||

            transaction.riskLevel ===
                "CRITICAL"
    ).length;

}


function getBlockedCount() {

    return transactions.filter(
        transaction =>

            transaction.action ===
                "BLOCK" ||

            transaction.status ===
                "BLOCKED"
    ).length;

}


function showActionToast(message) {

    let toast =
        getElement("riskshieldToast");


    if (!toast) {

        toast =
            document.createElement("div");

        toast.id =
            "riskshieldToast";


        toast.style.position =
            "fixed";

        toast.style.bottom =
            "25px";

        toast.style.right =
            "25px";

        toast.style.zIndex =
            "10000";

        toast.style.padding =
            "14px 20px";

        toast.style.borderRadius =
            "12px";

        toast.style.background =
            "#111827";

        toast.style.border =
            "1px solid rgba(255,255,255,.12)";

        toast.style.color =
            "#ffffff";

        toast.style.boxShadow =
            "0 15px 40px rgba(0,0,0,.4)";


        document.body.appendChild(
            toast
        );

    }


    toast.textContent =
        message;


    toast.style.display =
        "block";


    clearTimeout(
        toast._timer
    );


    toast._timer =
        setTimeout(
            () => {

                toast.style.display =
                    "none";

            },
            2500
        );

}


function initializeModalHandlers() {

    const alertModal =
        getElement("alertModal");


    if (alertModal) {

        alertModal.addEventListener(
            "click",
            event => {

                if (
                    event.target ===
                    alertModal
                ) {

                    closeAlert();

                }

            }
        );

    }


    const investigationModal =
        getElement(
            "investigationModal"
        );


    if (investigationModal) {

        investigationModal.addEventListener(
            "click",
            event => {

                if (
                    event.target ===
                    investigationModal
                ) {

                    closeInvestigation();

                }

            }
        );

    }

}



document.addEventListener(
    "keydown",
    event => {

        if (event.key !== "Escape") {

            return;

        }


        closeAlert();

        closeInvestigation();

    }
);


window.analyzeTransaction =
    analyzeTransaction;

window.closeAlert =
    closeAlert;

window.blockTransaction =
    blockTransaction;

window.reviewTransaction =
    reviewTransaction;

window.clearHistory =
    clearHistory;

window.navigateToPage =
    navigateToPage;

window.openInvestigation =
    openInvestigation;

window.closeInvestigation =
    closeInvestigation;

window.investigationAction =
    investigationAction;

window.generateRiskReport =
    generateRiskReport;