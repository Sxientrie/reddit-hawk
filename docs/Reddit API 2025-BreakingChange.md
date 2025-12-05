# **2025 Reddit Integration Protocol: Sxentrie (RedditHawk) Technical Feasibility & Specification**

## **1\. Executive Summary and Strategic Feasibility Assessment**

### **1.1 Project Overview: The "First Responder" Mandate**

The technical objective defined for "Sxentrie" (codenamed RedditHawk) is to engineer a high-performance Chrome Extension capable of real-time monitoring across a targeted pool of Reddit communities (subreddits). The primary operational goal is "sub-minute polling," specifically to identify "hiring" or freelance opportunity keywords immediately upon publication. This requirement places the project in the category of "First Responder" tooling—applications where latency is the primary success metric. Unlike archival scrapers or analytical tools that tolerate minutes or hours of delay, Sxentrie must detect, process, and alert the user to a new submission within seconds of its ingestion into Reddit's backend database.

The architectural constraints are governed by Chrome's Manifest V3 (MV3) standard, which enforces an event-driven, ephemeral execution model via Service Workers. This presents specific challenges for persistent connectivity and real-time alerting, necessitating a "Split-Brain" architecture where data fetching occurs in the Service Worker while audio processing is offloaded to an Offscreen document.

### **1.2 The Feasibility Verdict: A Conditional Go**

Based on an exhaustive analysis of the current Reddit API landscape as of late 2025, the feasibility verdict for Project Sxentrie is a **Conditional Go**. The "Condition" is a fundamental pivot in the proposed distribution model.

The traditional SaaS approach—where a developer registers a single API application and embeds its credentials into the extension for all users—is technically viable but operationally impossible under the 2025 "Responsible Builder Policy." Reddit’s enforcement of a strict 100 Queries Per Minute (QPM) rate limit *per Client ID* 1 means a single shared key would be exhausted instantly by as few as two concurrent users polling at the required frequency. Furthermore, the cessation of self-service API access for generic commercial tools 4 makes obtaining a high-limit enterprise key unlikely for a niche freelancer tool.

Therefore, the only viable path to realizing the "First Responder" capability is the implementation of a **"Bring Your Own Key" (BYOK)** architecture. In this model, the extension serves as a logic shell, and each individual user must register their own "Installed App" via Reddit’s developer portal to obtain a unique Client ID. This strategy decentralizes the rate limit liability, granting each user their own isolated 100 QPM bucket, which is more than sufficient for the project's sub-minute polling goals.

### **1.3 Strategic Imperatives for 2025**

To navigate the hostility of the current API environment, the following strategic imperatives must be hard-coded into the development roadmap:

1. **Decentralized Authentication:** The onboarding flow must guide users through the manual creation of a Reddit API app. The application cannot ship with a default key.  
2. **Aggressive Request Batching:** To respect the 100 QPM limit while monitoring 20+ subreddits, the polling logic must utilize Reddit's multi-subreddit endpoint syntax (e.g., r/sub1+sub2/new). This condenses 20 logical checks into a single API transaction, reducing quota consumption by 95%.6  
3. **Strict Header Compliance:** Reddit’s security filters aggressively block generic or malformed User-Agents. The extension must dynamically construct a compliant User-Agent string adhering to the \<platform\>:\<app ID\>:\<version string\> (by /u/\<reddit username\>) format.1  
4. **Manifest V3 Adaptation:** The authentication flow must abandon legacy web techniques in favor of chrome.identity.launchWebAuthFlow, utilizing the specific chromiumapp.org redirect method to ensure compatibility with Service Worker restrictions.8

## ---

**2\. Contextual Analysis: The 2025 Reddit API Landscape**

### **2.1 The "Post-APIcalypse" Environment**

The Reddit API ecosystem has undergone a radical transformation, often referred to by developers as the "Post-APIcalypse," following the pricing changes of July 2023 and the subsequent policy tightenings in 2024 and 2025\. This era is characterized by the shift from an open platform to a "Walled Garden" controlled by the **Responsible Builder Policy**.5

Historically, developers could freely create applications via prefs/apps with minimal friction. However, as of November 2025, this self-service capability has been severely curtailed. Research indicates that new attempts to generate API keys for "script" or generic use cases often result in immediate rejection or "Manual Approval" queues that prioritize academic research and moderation tools over commercial utilities.4 The support channels explicitly state that applications "lacking necessary details" or not aligning with the policy are denied without recourse.4

This environment creates a binary outcome for new projects:

1. **Enterprise Partnership:** Paying effectively $0.24 per 1,000 calls, which destroys the unit economics of a low-cost freelancer tool.3  
2. **Personal Use Exemption:** Utilizing the "Installed App" category intended for personal scripts and mobile apps, which often bypasses the strictest manual reviews if the traffic volume remains low and isolated to a single user account.11

For Sxentrie, the "Personal Use Exemption" accessed via the BYOK model is the only survival strategy. By instructing users to create their own apps, the project effectively distributes its footprint. Instead of one "Sxentrie" app making 100,000 requests an hour, Reddit sees 1,000 distinct "Personal Apps" each making 100 requests an hour. This traffic pattern is indistinguishable from legitimate personal browsing or automation scripts, which remain a protected class of usage under the current Terms of Service.13

### **2.2 The Mechanics of the "Manual Approval" Barrier**

It is critical to understand the mechanism of the "Manual Approval" barrier to guide users correctly. Reports suggest that while the "Create App" button is technically present, it may be disabled or return generic errors ("You cannot create any more applications") for accounts that have no history of developer activity or are flagged by internal risk models.14

However, the "Installed App" type—specifically designed for software running on user devices where the developer cannot secure a secret—often has a different validation track compared to "Web Apps" or "Scripts".16 The "Installed App" designation implies a non-confidential client, which Reddit’s infrastructure treats with different security assumptions. The research confirms that users successfully patching legacy apps like "Reddit is Fun" (RIF) or "Infinity" are doing so by generating "Installed App" keys on their personal accounts.13 This empirically validates that the prefs/apps portal remains functional for this specific app type, provided the user's account is in good standing.

### **2.3 The "Bring Your Own Key" (BYOK) Necessity**

The most profound technical insight derived from the rate limit documentation is the scope of the quota application. The 100 QPM limit for the free tier is applied **per Client ID**.1 This is a distinct departure from platforms that limit per IP or per User Token for a shared app.

If Sxentrie were to attempt a centralized key distribution (SaaS model):

* **User Base:** 500 active freelancers.  
* **Polling Frequency:** Once every 30 seconds (required for "First Responder" efficacy).  
* **Total Throughput:** $500 \\times 2 \= 1,000$ requests per minute.  
* **Limit:** 100 requests per minute.  
* **Deficit:** 900 requests per minute rejected.

The centralized model fails mathematically at a trivial scale. In contrast, the BYOK model:

* **User Base:** 500 active freelancers.  
* **Client IDs:** 500 unique IDs.  
* **Throughput per ID:** 2 requests per minute.  
* **Limit per ID:** 100 requests per minute.  
* **Headroom:** 98 requests per minute (98% capacity remaining).

This architectural decision is non-negotiable. The report proceeds with the assumption that Sxentrie will function as a BYOK client.

## ---

**3\. Authentication & Access Protocol (The "2025 Barrier")**

### **3.1 Application Type Selection**

When a user navigates to Reddit's developer portal to generate credentials for Sxentrie, they are presented with three application types: "Web app," "Installed app," and "Script." The selection here is critical because it dictates the OAuth2 flow and the security expectations of the Reddit backend.

**Verdict:** The user **MUST** select **"Installed App"**.

* **Script:** This type expects a "Confidential Client" capable of storing a client\_secret securely. In a Chrome Extension, all source code is readable by the user. If Sxentrie were to use the "Script" type, it would either force the user to manage a secret (increasing complexity) or insecurely store it. Furthermore, "Script" apps are often subject to tighter scrutiny regarding automation.15  
* **Web App:** This type requires a server-side redirect URI (e.g., a callback to a backend server). This violates the "Local-First" architecture of a Chrome Extension and introduces unnecessary server dependency.  
* **Installed App:** This type is explicitly designed for mobile apps and desktop clients (extensions included) where the binary is distributed to users.11 It utilizes the OAuth2 flow for "Public Clients," which does not require a client\_secret for the token exchange. This aligns perfectly with the BYOK model where the user provides only the Client ID.

### **3.2 OAuth2 Flow Analysis: PKCE vs. Implicit vs. Code**

Modern security standards (RFC 7636\) recommend Proof Key for Code Exchange (PKCE) for public clients to prevent authorization code interception. However, the research indicates a significant deviation in Reddit's implementation compared to industry standards like Google or Microsoft.

**Status of PKCE:** Reddit **does not support PKCE**.19 Attempts to send code\_challenge and code\_verifier parameters are ignored or cause errors. This forces the selection between the "Implicit Grant" and the "Authorization Code Grant" (without secret).

**Comparative Analysis of Auth Flows:**

| Feature | Implicit Grant | Authorization Code (No Secret) | Recommendation |
| :---- | :---- | :---- | :---- |
| **Response Type** | response\_type=token | response\_type=code | **Code** |
| **Security** | Low (Token in URL fragment) | Medium (Code exchange required) | **Code** |
| **Token Lifespan** | 1 Hour (Fixed) | 1 Hour (Renewable) | **Code** |
| **Refresh Token** | **NO** | **YES** (with duration=permanent) | **Code** |
| **UX Impact** | User must log in every hour. | "Login once, run forever." | **Code** |

Selected Strategy: Authorization Code Grant with duration=permanent.  
The "First Responder" nature of Sxentrie requires the Service Worker to run in the background 24/7. The Implicit Grant flow would require the user to manually re-authenticate every hour, rendering the tool useless for overnight or long-duration monitoring. The Authorization Code flow allows the extension to obtain a refresh\_token, enabling it to silently mint new access tokens whenever necessary without user intervention.18

### **3.3 The Redirect URI Strategy (chromiumapp.org)**

A critical friction point in Chrome Extension OAuth is the Redirect URI. Reddit’s strict matching algorithm requires the URI in the authorization request to strictly match the one registered in the app settings.

**The Solution:** The **Chromium Identity API** standardizes this redirect using the chromiumapp.org domain.

* **URI Pattern:** https://\<EXTENSION\_ID\>.chromiumapp.org/  
* **Mechanism:** When chrome.identity.launchWebAuthFlow is invoked, the browser listens for redirects to this specific pattern. It intercepts the request, extracts the URL parameters (containing the code), and passes them back to the extension script.8  
* **User Instruction:** During the BYOK setup, the user must be explicitly instructed to paste their unique chromiumapp.org URI into the Reddit App "Redirect URI" field. The extension can generate this string for them using chrome.identity.getRedirectURL().

**Note on Fallbacks:** While some legacy extensions used http://localhost, this is unreliable in MV3 Service Workers due to the lack of persistent listeners. The chromiumapp.org method is the only robust, compliant path.22

### **3.4 User-Agent Strictness**

Reddit’s API gateway employs sophisticated filtering to block bots. The most common cause of immediate 429 or 403 errors is a generic User-Agent (e.g., Mozilla/5.0 or python-requests). The API rules mandate a specific format that identifies the client and the user.

Required Format:  
\<platform\>:\<app ID\>:\<version string\> (by /u/\<reddit username\>)  
**Implementation Specification:**

* **Platform:** chrome-extension (Descriptive and accurate).  
* **App ID:** com.sxentrie.reddithawk (Or a similar unique identifier).  
* **Version:** v1.0.0 (Must match the manifest version).  
* **Username:** This is the dynamic variable. Upon initial authentication, the extension must fetch the user's identity via /api/v1/me to populate this field.

Example String:  
chrome-extension:com.sxentrie.reddithawk:v1.0.0 (by /u/FreelanceHunter)  
**Warning:** The research highlights that failing to include the username or using a generic string is a primary vector for "shadowbanning" (where requests return 200 OK but empty data) or blocking.1 The AI Coder must ensure this header is injected into *every* request, not just the initial handshake.

## ---

**4\. Traffic Engineering & Rate Limits**

### **4.1 The 100 QPM vs. 10 QPM Dichotomy**

The "First Responder" capability hinges on the ability to poll frequently. The research clarifies the bifurcated rate limit structure enforced by Reddit since July 2023:

1. **OAuth Authenticated Clients:** **100 Queries Per Minute (QPM)**. This limit is applied per Client ID. In the BYOK model, this is the limit available to the single user.1  
2. **Unauthenticated Clients:** **10 QPM**. This limit is often applied per IP address.

**Strategic Implication:** The "10 QPM" limit is insufficient for real-time polling of multiple resources. Attempting to access .json endpoints without an OAuth token would result in immediate throttling given the "pool of 20 subreddits" requirement. Sxentrie **must** operate exclusively in the Authenticated tier.

### **4.2 The Token Bucket Algorithm**

Reddit’s rate limiter implements a "Token Bucket" algorithm, typically windowed over a 10-minute period (600 seconds). The limit is defined as **600 requests per 600 seconds**.20

Burst Capability:  
Crucially, the limiter allows for "bursts." A client is not strictly limited to 1 request per second. If the bucket is full (600 tokens), the client could theoretically make 10 requests in a single second, reducing the bucket to 590\. This is vital for Sxentrie, as it may need to fetch metadata or perform follow-up queries immediately after detecting a keyword.  
Safety Margin:  
While the limit is 100 QPM, reliable engineering practice suggests utilizing a "Safety Factor" of 0.8.

* **Target Max:** 80 QPM.  
* **Polling Interval:** With batching (discussed in Section 6), a single request retrieves all data. Even polling every 5 seconds consumes only 12 QPM ($12 \\ll 100$). This confirms that **sub-minute polling is not just feasible, but can be aggressively tuned to sub-10-second polling**.

### **4.3 Header Decoding Specification**

The Service Worker must implement a passive inspection of response headers to maintain an internal model of the rate limit state. This "Circuit Breaker" ensures the extension never hits a hard 429 error.

Headers to Parse 25:

* x-ratelimit-remaining: The approximate number of requests left in the current window. **(Primary Signal)**  
* x-ratelimit-reset: The number of seconds until the window resets and the bucket refills.  
* x-ratelimit-used: The number of requests consumed in the current window.

Logic Gate:  
The AI Coder must implement the following interceptor logic:

JavaScript

const REMAINING \= parseInt(headers.get('x-ratelimit-remaining'));  
const RESET \= parseInt(headers.get('x-ratelimit-reset'));

if (REMAINING \< 5) {  
    // CRITICAL: Engage Circuit Breaker  
    const backoffTime \= (RESET \+ 1) \* 1000; // Add 1s buffer  
    console.warn(\`Rate limit near exhaustion. Pausing for ${backoffTime}ms\`);  
    suspendPolling(backoffTime);  
}

This logic prevents the extension from ever triggering a ban, preserving the API key's reputation.

## ---

**5\. Endpoint Strategy & Payload Analysis**

### **5.1 The Fallacy of the ".json Hack"**

A common technique in early Reddit bots was appending .json to URLs (e.g., reddit.com/new.json) to bypass API complexity. The research confirms this is **non-viable for Sxentrie**.

* **Limit:** 10 QPM.10  
* **Reliability:** Subject to aggressive caching and opaque IP-based blocking.  
* **Verdict:** Abandon. Use https://oauth.reddit.com endpoints exclusively.

### **5.2 Aggressive Batching: The "Pool Rotation"**

To monitor 20 subreddits, naive implementations would issue 20 separate GET requests.

* Cost: 20 tokens per poll.  
* Frequency: Every 30 seconds \= 40 requests/minute.  
* Total: 40 QPM (40% of limit).  
  While feasible, this is inefficient.

Optimization: The Multi-Reddit Syntax  
Reddit supports joining subreddit names with a \+ operator in the URL path.  
Endpoint: https://oauth.reddit.com/r/subreddit1+subreddit2+subreddit3/new  
Cost: 1 Token per request.6  
This changes the math dramatically:

* **Batch:** 20 subreddits concatenated.  
* **Cost:** 1 Token per poll.  
* **Frequency:** Every 5 seconds \= 12 requests/minute.  
* **Total:** 12 QPM (12% of limit).

Implementation Detail:  
The URL length limit is approximately 2,000 characters. With average subreddit names (10 chars), a single batch can easily support 50+ subreddits. For the requirement of \~20 subreddits, a single batch is sufficient. If the user tracks more, the "Pool Rotation" logic should be:

1. **Batch A (Subs 1-30):** Poll at $T=0$.  
2. **Batch B (Subs 31-60):** Poll at $T=2$ (staggered to smooth network load).

### **5.3 Payload Schema & Keyword Detection**

The response from the /new endpoint is a nested JSON object. The parser must navigate this structure robustly.

Schema Path 28:  
The data resides in response.data.children, which is an array of "Listing" objects.  
Each object has a data property containing the fields of interest.  
**Target Fields:**

| Field | JSON Path | Type | Purpose |
| :---- | :---- | :---- | :---- |
| **Title** | child.data.title | String | Primary keyword search target. |
| **Body** | child.data.selftext | String | Secondary keyword search target. |
| **Author** | child.data.author | String | Filtering (ignore AutoModerator). |
| **Timestamp** | child.data.created\_utc | Float | Freshness check (Post \> LastPollTime). |
| **Flair** | child.data.link\_flair\_text | String | Filtering (e.g., ignore "Question"). |
| **URL** | child.data.permalink | String | Link for the user alert. |

**Parsing Note:** link\_flair\_text may be null if no flair is assigned. The code must handle null safety to avoid runtime errors in the Service Worker.

## ---

**6\. Chrome Extension Constraints (Manifest V3)**

### **6.1 The CORS Barrier & Host Permissions**

In Manifest V3, Service Workers are subject to Cross-Origin Resource Sharing (CORS) restrictions. A fetch() request from the extension to oauth.reddit.com will be blocked by the browser by default because the origin chrome-extension://... does not match the Reddit domain.

The Solution:  
The manifest.json must explicitly declare ownership of the target domains in the host\_permissions array. This signals the browser to strip the Origin restrictions for these specific URLs.31

JSON

"host\_permissions": \[  
  "https://oauth.reddit.com/\*",  
  "https://www.reddit.com/\*"  
\]

Without this declaration, the entire networking stack of Sxentrie will fail with opaque "Network Error" messages.

### **6.2 Service Worker Architecture: The "Split-Brain"**

The user requirement mentions a "Split-Brain" architecture (Service Worker \+ Offscreen). This is a direct response to MV3 limitations regarding audio.

* **Service Workers:** Cannot play audio directly (no DOM access).  
* **Offscreen Document:** A hidden HTML page that *can* play audio.

**Communication Flow:**

1. **Service Worker:** Polls Reddit API \-\> Detects Keyword.  
2. **Service Worker:** Sends message chrome.runtime.sendMessage({type: 'PLAY\_ALERT'}).  
3. **Offscreen Document:** Listens for message \-\> Triggers HTML5 Audio API.

This separation of concerns is mandatory. The Service Worker handles the "First Responder" logic (data), while the Offscreen document handles the "First Responder" alert (sensory).

### **6.3 Authentication Flow Specification (launchWebAuthFlow)**

The traditional OAuth method of opening a popup window and scraping the URL is unreliable in MV3. The chrome.identity API provides a dedicated method for this.

**Step-by-Step Logic for AI Coder:**

1. Endpoint Construction:  
   The authorization URL must use response\_type=code and duration=permanent.  
   JavaScript  
   const authUrl \= \`https://www.reddit.com/api/v1/authorize?\` \+  
     \`client\_id=${userClientId}&\` \+  
     \`response\_type=code&\` \+  
     \`state=${randomState}&\` \+  
     \`redirect\_uri=${encodeURIComponent('https://\<EXT\_ID\>.chromiumapp.org/')}&\` \+  
     \`duration=permanent&\` \+  
     \`scope=read identity\`;

2. Launch:  
   Use chrome.identity.launchWebAuthFlow.  
   JavaScript  
   chrome.identity.launchWebAuthFlow({  
     url: authUrl,  
     interactive: true  
   }, (redirectUrl) \=\> {  
     // Callback with the URL containing the code  
   });

3. Token Exchange (The "Basic Auth" Trap):  
   This is the most common failure point. When exchanging the code for the access\_token via POST, Reddit expects Basic Authentication headers even if there is no client secret.  
   * **Header:** Authorization: Basic \<Base64(ClientID \+ ":")\>  
   * **Note:** The colon : is essential. It signifies a username (Client ID) and an empty password. If the colon is missing, the Base64 string will be incorrect, and Reddit will return 401\.18

## ---

**7\. "First Responder" Safety Protocols**

### **7.1 Circuit Breaker Status Codes**

A "First Responder" tool must be aggressive but not suicidal. Recognizing the signals of a ban is critical.

**Status Code Matrix:**

* **429 Too Many Requests:** The rate limit has been exceeded. The response will usually contain a Retry-After header or the standard x-ratelimit-reset. **Action:** Immediate sleep.  
* **403 Forbidden:** Access is denied. This often happens if the user tries to poll a private subreddit or if the Client ID has been revoked. **Action:** Log error and stop polling that specific resource.  
* **200 OK (Empty):** If data.children is empty repeatedly on a high-traffic subreddit (like r/all), it indicates a **Shadowban**. The API is "pretending" to work but withholding data. **Action:** Alert the user to check their account standing.

### **7.2 The "Sleep-Wait" Polling Loop**

To ensure stability, the polling loop should not use setInterval (which can drift or stack requests if the network hangs). Instead, it should use a recursive "Sleep-Wait" pattern.

**Algorithm:**

1. **Start:** poll()  
2. **Fetch:** await fetch(batch\_url)  
3. **Process:** Analyze posts.  
4. **Calculate Sleep:** delay \= (x\_ratelimit\_remaining \< 10)? x\_ratelimit\_reset : 5  
5. **Schedule Next:** setTimeout(poll, delay \* 1000\)

This adaptive timing ensures that Sxentrie naturally slows down during congestion and speeds up during clear windows, maintaining "First Responder" status without violating limits.

## ---

**8\. Implementation Guide (For AI Coder)**

### **8.1 manifest.json Core**

JSON

{  
  "manifest\_version": 3,  
  "name": "Sxentrie (RedditHawk)",  
  "version": "1.0.0",  
  "permissions": \[  
    "identity",  
    "storage",  
    "offscreen",  
    "notifications",  
    "alarms"  
  \],  
  "host\_permissions": \[  
    "https://oauth.reddit.com/\*",  
    "https://www.reddit.com/\*"  
  \],  
  "background": {  
    "service\_worker": "background.js"  
  }  
}

### **8.2 Authentication Service (auth.js)**

JavaScript

// Verification of Basic Auth Header construction  
function getAuthHeader(clientId) {  
  // The colon is critical for "Empty Password"  
  return 'Basic ' \+ btoa(clientId \+ ':');  
}

async function exchangeCodeForToken(code, clientId) {  
  const redirectUri \= chrome.identity.getRedirectURL();  
  const response \= await fetch('https://www.reddit.com/api/v1/access\_token', {  
    method: 'POST',  
    headers: {  
      'Authorization': getAuthHeader(clientId),  
      'Content-Type': 'application/x-www-form-urlencoded'  
    },  
    body: \`grant\_type=authorization\_code\&code=${code}\&redirect\_uri=${redirectUri}\`  
  });  
  return response.json();  
}

### **8.3 Polling Service (poller.js)**

JavaScript

// Dynamic User-Agent Construction  
function getUserAgent(username) {  
  return \`chrome-extension:com.sxentrie.reddithawk:v1.0.0 (by /u/${username})\`;  
}

async function fetchBatch(subreddits, token, username) {  
  const batchString \= subreddits.join('+');  
  const url \= \`https://oauth.reddit.com/r/${batchString}/new?limit=100\`;  
    
  const response \= await fetch(url, {  
    headers: {  
      'Authorization': \`Bearer ${token}\`,  
      'User-Agent': getUserAgent(username)  
    }  
  });

  // Header Parsing for Circuit Breaker  
  const remaining \= response.headers.get('x-ratelimit-remaining');  
  const reset \= response.headers.get('x-ratelimit-reset');  
    
  if (response.status \=== 429 |

| (remaining && parseInt(remaining) \< 5)) {  
    throw new Error('RATE\_LIMIT\_HIT', { cause: reset });  
  }

  return response.json();  
}

## ---

**9\. Conclusion**

The technical reconnaissance for Sxentrie confirms that building a "First Responder" Reddit monitor in 2025 is feasible, but strictly bounded by the new API reality. The project's success relies less on complex code and more on a clever deployment strategy: the **"Bring Your Own Key" (BYOK)** model.

By offloading the API credential creation to the user, adhering to the "Installed App" application type, and utilizing the "Multi-Reddit" batching endpoint, Sxentrie can achieve sub-minute polling latencies that rival enterprise tools. The primary engineering challenges—Service Worker authentication and rate limit management—have been addressed with specific protocol definitions (Authorization Code flow with chromiumapp.org redirect and passive header inspection). The path forward is clear: build a robust shell that empowers the user to wield their own API quota effectively.

#### **Works cited**

1. Reddit Data API Wiki \- Reddit Help, accessed December 5, 2025, [https://support.reddithelp.com/hc/en-us/articles/16160319875092-Reddit-Data-API-Wiki](https://support.reddithelp.com/hc/en-us/articles/16160319875092-Reddit-Data-API-Wiki)  
2. API Update: Enterprise Level Tier for Large Scale Applications \- Reddit, accessed December 5, 2025, [https://www.reddit.com/r/redditdev/comments/13wsiks/api\_update\_enterprise\_level\_tier\_for\_large\_scale/](https://www.reddit.com/r/redditdev/comments/13wsiks/api_update_enterprise_level_tier_for_large_scale/)  
3. Reddit API Essential Guide \- Rollout, accessed December 5, 2025, [https://rollout.com/integration-guides/reddit/api-essentials](https://rollout.com/integration-guides/reddit/api-essentials)  
4. I'm a researcher and I really need an api for reddit to support my research, but my application was rejected. : r/redditdev, accessed December 5, 2025, [https://www.reddit.com/r/redditdev/comments/1p0bjgy/im\_a\_researcher\_and\_i\_really\_need\_an\_api\_for/](https://www.reddit.com/r/redditdev/comments/1p0bjgy/im_a_researcher_and_i_really_need_an_api_for/)  
5. Introducing the Responsible Builder Policy \+ new approval process for API access \- Reddit, accessed December 5, 2025, [https://www.reddit.com/r/redditdev/comments/1oug31u/introducing\_the\_responsible\_builder\_policy\_new/](https://www.reddit.com/r/redditdev/comments/1oug31u/introducing_the_responsible_builder_policy_new/)  
6. What counts as a request? : r/redditdev, accessed December 5, 2025, [https://www.reddit.com/r/redditdev/comments/z00tgc/what\_counts\_as\_a\_request/](https://www.reddit.com/r/redditdev/comments/z00tgc/what_counts_as_a_request/)  
7. Please ensure your user-agents are unique and descriptive \- Reddit, accessed December 5, 2025, [https://www.reddit.com/r/redditdev/comments/1j2sgxw/please\_ensure\_your\_useragents\_are\_unique\_and/](https://www.reddit.com/r/redditdev/comments/1j2sgxw/please_ensure_your_useragents_are_unique_and/)  
8. Estensione Cross-Browser OAuth2 con Google Calendar API: Come evitare client\_secret e redirect\_uri\_mismatch mantenendo il refresh del token possibile? : r/chrome\_extensions \- Reddit, accessed December 5, 2025, [https://www.reddit.com/r/chrome\_extensions/comments/1nfkmjc/crossbrowser\_extension\_oauth2\_with\_google/?tl=it](https://www.reddit.com/r/chrome_extensions/comments/1nfkmjc/crossbrowser_extension_oauth2_with_google/?tl=it)  
9. Connect Google Sign in and supabase to my chrome extension \- Reddit, accessed December 5, 2025, [https://www.reddit.com/r/chrome\_extensions/comments/1fzzvu0/connect\_google\_sign\_in\_and\_supabase\_to\_my\_chrome/](https://www.reddit.com/r/chrome_extensions/comments/1fzzvu0/connect_google_sign_in_and_supabase_to_my_chrome/)  
10. The Ongoing Impact of Reddits API Rate Limits \- GitHub, accessed December 5, 2025, [https://github.com/MalloyDelacroix/DownloaderForReddit/wiki/The-Ongoing-Impact-of-Reddits-API-Rate-Limits](https://github.com/MalloyDelacroix/DownloaderForReddit/wiki/The-Ongoing-Impact-of-Reddits-API-Rate-Limits)  
11. 3rd party app support for Reddit using ReVanced \[SIMPLE GUIDE\] : r/Android, accessed December 5, 2025, [https://www.reddit.com/r/Android/comments/14o9avv/3rd\_party\_app\_support\_for\_reddit\_using\_revanced/](https://www.reddit.com/r/Android/comments/14o9avv/3rd_party_app_support_for_reddit_using_revanced/)  
12. Reddit is restricting all API access behind manual approval. Revanced will no longer be able to patch old reddit apps, accessed December 5, 2025, [https://www.reddit.com/r/revancedapp/comments/1oulbge/reddit\_is\_restricting\_all\_api\_access\_behind/](https://www.reddit.com/r/revancedapp/comments/1oulbge/reddit_is_restricting_all_api_access_behind/)  
13. RIF just logged me out and is giving me an error 403 : r/revancedapp \- Reddit, accessed December 5, 2025, [https://www.reddit.com/r/revancedapp/comments/1j2oix3/rif\_just\_logged\_me\_out\_and\_is\_giving\_me\_an\_error/](https://www.reddit.com/r/revancedapp/comments/1j2oix3/rif_just_logged_me_out_and_is_giving_me_an_error/)  
14. How long does it take to be approved for reddit api commercial use? : r/redditdev, accessed December 5, 2025, [https://www.reddit.com/r/redditdev/comments/1oa74aw/how\_long\_does\_it\_take\_to\_be\_approved\_for\_reddit/](https://www.reddit.com/r/redditdev/comments/1oa74aw/how_long_does_it_take_to_be_approved_for_reddit/)  
15. Can't create a Reddit app — “You cannot create any more applications” error : r/redditdev, accessed December 5, 2025, [https://www.reddit.com/r/redditdev/comments/1p2ashw/cant\_create\_a\_reddit\_app\_you\_cannot\_create\_any/](https://www.reddit.com/r/redditdev/comments/1p2ashw/cant_create_a_reddit_app_you_cannot_create_any/)  
16. Class: snoowrap \- GitHub Pages, accessed December 5, 2025, [https://not-an-aardvark.github.io/snoowrap/snoowrap.html](https://not-an-aardvark.github.io/snoowrap/snoowrap.html)  
17. Continuum, a fork of Infinity for Reddit : r/revancedapp, accessed December 5, 2025, [https://www.reddit.com/r/revancedapp/comments/1jvvyov/continuum\_a\_fork\_of\_infinity\_for\_reddit/](https://www.reddit.com/r/revancedapp/comments/1jvvyov/continuum_a_fork_of_infinity_for_reddit/)  
18. OAuth2 · reddit-archive/reddit Wiki \- GitHub, accessed December 5, 2025, [https://github.com/reddit-archive/reddit/wiki/oauth2](https://github.com/reddit-archive/reddit/wiki/oauth2)  
19. OAuth: client\_secret vs PKCE : r/redditdev, accessed December 5, 2025, [https://www.reddit.com/r/redditdev/comments/1d9tf9h/oauth\_client\_secret\_vs\_pkce/](https://www.reddit.com/r/redditdev/comments/1d9tf9h/oauth_client_secret_vs_pkce/)  
20. Confusion about Rate Limits and OAuth2 \- Reddit, accessed December 5, 2025, [https://www.reddit.com/r/redditdev/comments/kxg84s/confusion\_about\_rate\_limits\_and\_oauth2/](https://www.reddit.com/r/redditdev/comments/kxg84s/confusion_about_rate_limits_and_oauth2/)  
21. chrome.identity | API \- Chrome for Developers, accessed December 5, 2025, [https://developer.chrome.com/docs/extensions/reference/api/identity](https://developer.chrome.com/docs/extensions/reference/api/identity)  
22. What is the correct redirect URL for chrome.identity.launchWebAuthFlow? \- Stack Overflow, accessed December 5, 2025, [https://stackoverflow.com/questions/18312118/what-is-the-correct-redirect-url-for-chrome-identity-launchwebauthflow](https://stackoverflow.com/questions/18312118/what-is-the-correct-redirect-url-for-chrome-identity-launchwebauthflow)  
23. r/redditdev on Reddit: Script user agent of different devices, accessed December 5, 2025, [https://www.reddit.com/r/redditdev/comments/xhjlvx/script\_user\_agent\_of\_different\_devices/](https://www.reddit.com/r/redditdev/comments/xhjlvx/script_user_agent_of_different_devices/)  
24. Updated rate limits going into effect over the coming weeks \- Reddit, accessed December 5, 2025, [https://www.reddit.com/r/redditdev/comments/14nbw6g/updated\_rate\_limits\_going\_into\_effect\_over\_the/](https://www.reddit.com/r/redditdev/comments/14nbw6g/updated_rate_limits_going_into_effect_over_the/)  
25. Get Comments from a lot of Threads : r/redditdev, accessed December 5, 2025, [https://www.reddit.com/r/redditdev/comments/17j1cfv/get\_comments\_from\_a\_lot\_of\_threads/](https://www.reddit.com/r/redditdev/comments/17j1cfv/get_comments_from_a_lot_of_threads/)  
26. Understanding the X-Rate-Limit- response headers : r/pathofexiledev \- Reddit, accessed December 5, 2025, [https://www.reddit.com/r/pathofexiledev/comments/1c3bff2/understanding\_the\_xratelimit\_response\_headers/](https://www.reddit.com/r/pathofexiledev/comments/1c3bff2/understanding_the_xratelimit_response_headers/)  
27. \[FEATURE\] Rate limit option for free API users · Issue \#945 · Serene-Arc/bulk-downloader-for-reddit \- GitHub, accessed December 5, 2025, [https://github.com/aliparlakci/bulk-downloader-for-reddit/issues/945](https://github.com/aliparlakci/bulk-downloader-for-reddit/issues/945)  
28. D1.3 – Feature definitions and extraction methods, accessed December 5, 2025, [https://ec.europa.eu/research/participants/documents/downloadPublic?documentIds=080166e5b0a2d12c\&appId=PPGMS](https://ec.europa.eu/research/participants/documents/downloadPublic?documentIds=080166e5b0a2d12c&appId=PPGMS)  
29. Sample Report 5 | PDF | Analytics | Applied Mathematics \- Scribd, accessed December 5, 2025, [https://www.scribd.com/document/856278391/Sample-Report-5](https://www.scribd.com/document/856278391/Sample-Report-5)  
30. Need advice on caching data retrieved from useeffect in react \- Kevin Powell, accessed December 5, 2025, [https://www.answeroverflow.com/m/1364899998197747772](https://www.answeroverflow.com/m/1364899998197747772)  
31. Help fetching external URLS from Chrome Extensions : r/chrome\_extensions \- Reddit, accessed December 5, 2025, [https://www.reddit.com/r/chrome\_extensions/comments/1bi3hc0/help\_fetching\_external\_urls\_from\_chrome\_extensions/](https://www.reddit.com/r/chrome_extensions/comments/1bi3hc0/help_fetching_external_urls_from_chrome_extensions/)  
32. How to fix Cross Origin Request policy blocking my script from accessing a file \- Reddit, accessed December 5, 2025, [https://www.reddit.com/r/learnjavascript/comments/1f9n66v/how\_to\_fix\_cross\_origin\_request\_policy\_blocking/](https://www.reddit.com/r/learnjavascript/comments/1f9n66v/how_to_fix_cross_origin_request_policy_blocking/)