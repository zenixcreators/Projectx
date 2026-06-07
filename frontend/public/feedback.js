(function () {
  // Prevent duplicate insertion
  if (document.getElementById('creo-feedback-btn-root')) return;

  // 1. Create and inject Stylesheet
  const style = document.createElement('style');
  style.id = 'creo-feedback-styles';
  style.textContent = `
    .creo-feedback-btn {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 52px;
      height: 52px;
      border-radius: 50%;
      background: linear-gradient(135deg, #7c5cff 0%, #6366f1 100%);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 6px 20px rgba(124, 92, 255, 0.35);
      border: none;
      z-index: 100000;
      transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .creo-feedback-btn:hover {
      transform: scale(1.08) translateY(-2px);
      box-shadow: 0 8px 24px rgba(124, 92, 255, 0.45);
    }
    .creo-feedback-btn:active {
      transform: scale(0.95);
    }
    .creo-feedback-btn i {
      font-size: 22px;
    }
    .creo-feedback-modal {
      position: fixed;
      bottom: 88px;
      right: 24px;
      width: 350px;
      background: #fcfbf8;
      border: 1px solid rgba(20, 20, 25, 0.1);
      border-radius: 16px;
      box-shadow: 0 12px 36px rgba(20, 20, 25, 0.15);
      z-index: 100000;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      opacity: 0;
      transform: translateY(20px) scale(0.95);
      pointer-events: none;
      transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
      font-family: 'Inter', -apple-system, sans-serif;
    }
    .creo-feedback-modal.open {
      opacity: 1;
      transform: translateY(0) scale(1);
      pointer-events: auto;
    }
    .creo-feedback-header {
      padding: 16px;
      border-bottom: 1px solid rgba(20, 20, 25, 0.06);
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f1f0ec;
    }
    .creo-feedback-header h3 {
      font-size: 15.5px;
      font-weight: 600;
      color: #111114;
      margin: 0;
    }
    .creo-feedback-close {
      background: transparent;
      border: none;
      color: #8b8894;
      cursor: pointer;
      font-size: 18px;
      padding: 4px;
      line-height: 1;
      transition: color 0.2s;
    }
    .creo-feedback-close:hover {
      color: #111114;
    }
    .creo-feedback-body {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .creo-feedback-section {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .creo-feedback-label {
      font-size: 12.5px;
      font-weight: 600;
      color: #5e5b66;
    }
    .creo-feedback-cats {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }
    .creo-feedback-cat-btn {
      padding: 6px 12px;
      border-radius: 20px;
      border: 1px solid rgba(20, 20, 25, 0.08);
      background: #ffffff;
      color: #5e5b66;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }
    .creo-feedback-cat-btn:hover {
      background: #eceae5;
    }
    .creo-feedback-cat-btn.active {
      background: #7c5cff;
      color: #ffffff;
      border-color: #7c5cff;
    }
    .creo-feedback-rating {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .creo-feedback-stars {
      display: flex;
      flex-direction: row-reverse;
      gap: 4px;
    }
    .creo-feedback-stars input {
      display: none;
    }
    .creo-feedback-star {
      font-size: 26px;
      color: #d1d5db;
      cursor: pointer;
      transition: color 0.15s, transform 0.15s;
    }
    .creo-feedback-star:hover,
    .creo-feedback-star:hover ~ .creo-feedback-star,
    .creo-feedback-stars input:checked ~ label,
    .creo-feedback-stars input:checked ~ label ~ label {
      color: #fbbf24;
    }
    .creo-feedback-stars label:hover ~ input:checked ~ label {
      color: #fbbf24;
    }
    .creo-feedback-input, .creo-feedback-textarea {
      width: 100%;
      padding: 10px 12px;
      border-radius: 8px;
      border: 1px solid rgba(20, 20, 25, 0.12);
      background: #ffffff;
      font-size: 13.5px;
      font-family: inherit;
      color: #111114;
      transition: border-color 0.2s;
    }
    .creo-feedback-input:focus, .creo-feedback-textarea:focus {
      border-color: #7c5cff;
      outline: none;
    }
    .creo-feedback-textarea {
      resize: none;
      height: 80px;
    }
    .creo-feedback-user-notice {
      font-size: 11.5px;
      color: #5e5b66;
      background: #f1f0ec;
      padding: 8px 12px;
      border-radius: 8px;
      border: 1px solid rgba(20, 20, 25, 0.04);
      line-height: 1.4;
    }
    .creo-feedback-submit {
      padding: 11px;
      border-radius: 8px;
      background: #7c5cff;
      color: #ffffff;
      border: none;
      font-weight: 600;
      font-size: 14px;
      cursor: pointer;
      transition: background 0.2s, transform 0.1s;
      margin-top: 4px;
    }
    .creo-feedback-submit:hover {
      background: #6366f1;
    }
    .creo-feedback-submit:active {
      transform: scale(0.98);
    }
    .creo-feedback-submit:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .creo-feedback-success {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 32px 16px;
      text-align: center;
      gap: 12px;
    }
    .creo-feedback-success-icon {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: rgba(22, 163, 74, 0.1);
      color: #16a34a;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
    }
    .creo-feedback-success h4 {
      font-size: 16px;
      font-weight: 600;
      color: #111114;
      margin: 0;
    }
    .creo-feedback-success p {
      font-size: 13px;
      color: #8b8894;
      margin: 0;
    }
  `;
  document.head.appendChild(style);

  // 2. Create UI Elements
  const container = document.createElement('div');
  container.id = 'creo-feedback-btn-root';
  container.innerHTML = `
    <button class="creo-feedback-btn" id="creoFeedbackBtn" title="Send Feedback">
      <i class="fa-solid fa-comment-dots"></i>
    </button>
    <div class="creo-feedback-modal" id="creoFeedbackModal">
      <div class="creo-feedback-header">
        <h3>Share your feedback</h3>
        <button class="creo-feedback-close" id="creoFeedbackClose" title="Close">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
      <div class="creo-feedback-body" id="creoFeedbackBody">
        <div class="creo-feedback-section">
          <label class="creo-feedback-label">Category</label>
          <div class="creo-feedback-cats">
            <button class="creo-feedback-cat-btn active" data-cat="love">Love it ❤️</button>
            <button class="creo-feedback-cat-btn" data-cat="bug">Bug 🐛</button>
            <button class="creo-feedback-cat-btn" data-cat="feature">Idea 💡</button>
            <button class="creo-feedback-cat-btn" data-cat="other">Other 💬</button>
          </div>
        </div>

        <div class="creo-feedback-section">
          <div class="creo-feedback-rating">
            <span class="creo-feedback-label">Rating</span>
            <div class="creo-feedback-stars">
              <input type="radio" id="creo-star5" name="creo-rating" value="5">
              <label for="creo-star5" class="creo-feedback-star" title="Excellent">★</label>
              <input type="radio" id="creo-star4" name="creo-rating" value="4">
              <label for="creo-star4" class="creo-feedback-star" title="Good">★</label>
              <input type="radio" id="creo-star3" name="creo-rating" value="3">
              <label for="creo-star3" class="creo-feedback-star" title="Average">★</label>
              <input type="radio" id="creo-star2" name="creo-rating" value="2">
              <label for="creo-star2" class="creo-feedback-star" title="Poor">★</label>
              <input type="radio" id="creo-star1" name="creo-rating" value="1">
              <label for="creo-star1" class="creo-feedback-star" title="Very Poor">★</label>
            </div>
          </div>
        </div>

        <div class="creo-feedback-section" id="creoFeedbackUserSection">
          <!-- Populated dynamically: inputs or notice -->
          <input type="text" id="creoFeedbackName" class="creo-feedback-input" placeholder="Your name (optional)">
          <input type="email" id="creoFeedbackEmail" class="creo-feedback-input" placeholder="Your email (optional)" style="margin-top: 8px;">
        </div>

        <div class="creo-feedback-section">
          <label for="creoFeedbackMsg" class="creo-feedback-label">Message</label>
          <textarea id="creoFeedbackMsg" class="creo-feedback-textarea" placeholder="Tell us how we can make Creo better..."></textarea>
        </div>

        <button class="creo-feedback-submit" id="creoFeedbackSubmit">Submit Feedback</button>
      </div>
    </div>
  `;
  document.body.appendChild(container);

  // 3. UI State and Element References
  const modal = document.getElementById('creoFeedbackModal');
  const btn = document.getElementById('creoFeedbackBtn');
  const closeBtn = document.getElementById('creoFeedbackClose');
  const submitBtn = document.getElementById('creoFeedbackSubmit');
  const messageInput = document.getElementById('creoFeedbackMsg');
  const userSection = document.getElementById('creoFeedbackUserSection');
  
  let selectedCategory = 'love';
  let currentUser = null;

  // Check auth status on load to customize experience
  async function checkAuth() {
    try {
      const res = await fetch('/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data && data.user) {
          currentUser = data.user;
          // Prefill/replace fields with logged in state notice
          const userName = currentUser.name || `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || 'Creator';
          userSection.innerHTML = `
            <div class="creo-feedback-user-notice">
              <i class="fa-solid fa-circle-user" style="margin-right:4px;"></i>
              Submitting as <strong>${userName}</strong> (${currentUser.email})
            </div>
          `;
        }
      }
    } catch (e) {
      // Offline or network error: defaults to email/name inputs
    }
  }
  checkAuth();

  // Toggle Category Selection
  const catBtns = container.querySelectorAll('.creo-feedback-cat-btn');
  catBtns.forEach(catBtn => {
    catBtn.addEventListener('click', () => {
      catBtns.forEach(c => c.classList.remove('active'));
      catBtn.classList.add('active');
      selectedCategory = catBtn.getAttribute('data-cat');
      
      // Update placeholder based on category to make it interactive!
      if (selectedCategory === 'bug') {
        messageInput.placeholder = "Describe the issue you encountered in detail...";
      } else if (selectedCategory === 'feature') {
        messageInput.placeholder = "What feature or idea would you like to see in Creo?";
      } else if (selectedCategory === 'love') {
        messageInput.placeholder = "Tell us what you love about Creo!";
      } else {
        messageInput.placeholder = "Tell us how we can make Creo better...";
      }
    });
  });

  // Modal Open/Close handlers
  btn.addEventListener('click', () => {
    modal.classList.toggle('open');
  });

  closeBtn.addEventListener('click', () => {
    modal.classList.remove('open');
  });

  // Close modal when clicking outside
  document.addEventListener('mousedown', (e) => {
    if (modal.classList.contains('open') && !container.contains(e.target)) {
      modal.classList.remove('open');
    }
  });

  // Submit Feedback Action
  submitBtn.addEventListener('click', async () => {
    const message = messageInput.value.trim();
    if (!message) {
      if (typeof window.showToast === 'function') {
        window.showToast("Message Required", "Please type a message before submitting.", "warning");
      } else {
        alert("Please enter a message.");
      }
      return;
    }

    // Get selected rating
    let rating = null;
    const ratingInput = container.querySelector('input[name="creo-rating"]:checked');
    if (ratingInput) {
      rating = parseInt(ratingInput.value, 10);
    }

    // Capture anonymous fields if visible
    let name = '';
    let email = '';
    const nameInput = document.getElementById('creoFeedbackName');
    const emailInput = document.getElementById('creoFeedbackEmail');
    if (nameInput) name = nameInput.value.trim();
    if (emailInput) email = emailInput.value.trim();

    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting...";

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: selectedCategory,
          rating,
          message,
          name: currentUser ? undefined : name,
          email: currentUser ? undefined : email
        })
      });

      if (res.ok) {
        // Show local success state inside modal
        const body = document.getElementById('creoFeedbackBody');
        const originalContent = body.innerHTML;
        
        body.innerHTML = `
          <div class="creo-feedback-success">
            <div class="creo-feedback-success-icon">
              <i class="fa-solid fa-circle-check"></i>
            </div>
            <h4>Feedback Submitted!</h4>
            <p>Thank you for helping us improve Creo.</p>
          </div>
        `;

        if (typeof window.showToast === 'function') {
          window.showToast("Thank You!", "Your feedback has been successfully submitted.", "success");
        }

        // Wait, then close modal and restore form
        setTimeout(() => {
          modal.classList.remove('open');
          setTimeout(() => {
            // Restore form fields
            body.innerHTML = originalContent;
            // Re-bind listener for cat selection
            const reCatBtns = container.querySelectorAll('.creo-feedback-cat-btn');
            reCatBtns.forEach(b => {
              if (b.getAttribute('data-cat') === selectedCategory) {
                b.classList.add('active');
              } else {
                b.classList.remove('active');
              }
              // re-bind click listener
              b.addEventListener('click', () => {
                reCatBtns.forEach(c => c.classList.remove('active'));
                b.classList.add('active');
                selectedCategory = b.getAttribute('data-cat');
                const textInput = document.getElementById('creoFeedbackMsg');
                if (selectedCategory === 'bug') textInput.placeholder = "Describe the issue you encountered in detail...";
                else if (selectedCategory === 'feature') textInput.placeholder = "What feature or idea would you like to see in Creo?";
                else if (selectedCategory === 'love') textInput.placeholder = "Tell us what you love about Creo!";
                else textInput.placeholder = "Tell us how we can make Creo better...";
              });
            });
            // Re-bind submit button listener
            const reSubmitBtn = document.getElementById('creoFeedbackSubmit');
            reSubmitBtn.disabled = false;
            reSubmitBtn.textContent = "Submit Feedback";
            // Re-bind auth values
            checkAuth();
          }, 300);
        }, 2500);

      } else {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to submit feedback.");
      }
    } catch (err) {
      console.error(err);
      if (typeof window.showToast === 'function') {
        window.showToast("Submission Failed", err.message || "Could not save feedback. Please try again.", "error");
      } else {
        alert(err.message || "Failed to submit feedback.");
      }
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit Feedback";
    }
  });

})();
