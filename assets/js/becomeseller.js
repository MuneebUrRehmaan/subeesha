
/* =========================================================
   SUBEESHA - BECOME RESELLER
   Fixed registration, Cloudinary uploads, Firebase save,
   CNIC formatting, document previews, FAQ and modal.
   ========================================================= */

(function () {
    "use strict"

    /* =====================================================
       GLOBAL HELPERS
    ===================================================== */

    const $ = (id) => document.getElementById(id)

    const SUB = window.SUB

    /* =====================================================
       SCROLL TO REGISTRATION
    ===================================================== */

    window.scrollToRegister = function () {
        const register = $("register")

        if (register) {
            register.scrollIntoView({
                behavior: "smooth",
                block: "start"
            })
        }
    }

    /* =====================================================
       FAQ
    ===================================================== */

    const faqItems = document.querySelectorAll(".faq-item")

    faqItems.forEach((item) => {
        const question = item.querySelector(".faq-question")

        if (!question) return

        question.addEventListener("click", function () {
            faqItems.forEach((otherItem) => {
                if (otherItem !== item) {
                    otherItem.classList.remove("active")
                }
            })

            item.classList.toggle("active")
        })
    })

    /* =====================================================
       CNIC FORMAT
       Format: 12345-1234567-1
    ===================================================== */

    const cnicInput = $("cnic")

    function formatCNIC(value) {
        const digits = value.replace(/\D/g, "").slice(0, 13)

        if (digits.length <= 5) {
            return digits
        }

        if (digits.length <= 12) {
            return digits.slice(0, 5) + "-" + digits.slice(5)
        }

        return (
            digits.slice(0, 5) +
            "-" +
            digits.slice(5, 12) +
            "-" +
            digits.slice(12, 13)
        )
    }

    if (cnicInput) {
        cnicInput.addEventListener("input", function () {
            this.value = formatCNIC(this.value)
        })
    }

    /* =====================================================
       DOCUMENT PREVIEW
    ===================================================== */

    const previewFields = [
        {
            input: "profilePicture",
            preview: "profilePreview"
        },
        {
            input: "cnicFront",
            preview: "cnicFrontPreview"
        },
        {
            input: "cnicBack",
            preview: "cnicBackPreview"
        },
        {
            input: "chequePicture",
            preview: "chequePreview"
        },
        {
            input: "feeReceipt",
            preview: "receiptPreview"
        }
    ]

    const originalPreviews = new Map()

    function restorePreview(previewId) {
        const preview = $(previewId)

        if (!preview) return

        if (originalPreviews.has(previewId)) {
            preview.innerHTML = originalPreviews.get(previewId)
        }
    }

    function showPDFPreview(preview, file) {
        preview.innerHTML = ""

        const icon = document.createElement("ion-icon")
        icon.setAttribute("name", "document-text-outline")

        const name = document.createElement("span")
        name.textContent = file.name

        preview.appendChild(icon)
        preview.appendChild(name)
    }

    function previewUpload(inputId, previewId) {
        const input = $(inputId)
        const preview = $(previewId)

        if (!input || !preview) {
            console.warn("Preview elements not found:", inputId, previewId)
            return
        }

        originalPreviews.set(previewId, preview.innerHTML)

        input.addEventListener("change", function () {
            const file = this.files && this.files[0]

            if (!file) {
                restorePreview(previewId)
                return
            }

            if (file.type === "application/pdf") {
                showPDFPreview(preview, file)
                return
            }

            if (!file.type.startsWith("image/")) {
                alert("Please select a valid image or PDF file.")
                input.value = ""
                restorePreview(previewId)
                return
            }

            const reader = new FileReader()

            reader.onload = function (event) {
                preview.innerHTML = ""

                const img = document.createElement("img")
                img.src = event.target.result
                img.alt = "Document Preview"

                preview.appendChild(img)
            }

            reader.onerror = function () {
                alert("Could not preview this image. Please select another file.")
                input.value = ""
                restorePreview(previewId)
            }

            reader.readAsDataURL(file)
        })
    }

    previewFields.forEach((field) => {
        previewUpload(field.input, field.preview)
    })

    function resetDocumentPreviews() {
        previewFields.forEach((field) => {
            const input = $(field.input)

            if (input) {
                input.value = ""
            }

            restorePreview(field.preview)
        })
    }

    /* =====================================================
       SUCCESS MODAL
    ===================================================== */

    const successModal = $("successModal")

    window.closeSuccessModal = function () {
        if (successModal) {
            successModal.classList.remove("show")
        }

        document.body.style.overflow = ""
    }

    if (successModal) {
        successModal.addEventListener("click", function (event) {
            if (event.target === successModal) {
                window.closeSuccessModal()
            }
        })
    }

    function showSuccessModal() {
        if (successModal) {
            successModal.classList.add("show")
            document.body.style.overflow = "hidden"
        } else {
            alert("Your reseller application was submitted successfully.")
        }
    }

    /* =====================================================
       CLOUDINARY RESPONSE URL
    ===================================================== */

    function getUploadedURL(response) {
        if (typeof response === "string") {
            return response
        }

        if (!response) {
            return null
        }

        return (
            response.url ||
            response.secure_url ||
            response.secureUrl ||
            response.data?.secure_url ||
            response.data?.url ||
            null
        )
    }

    /* =====================================================
       RESELLER FORM SUBMISSION
    ===================================================== */

    const resellerForm = $("resellerForm")

    if (!resellerForm) {
        console.error("Reseller form not found.")
        return
    }

    let isSubmitting = false

    const documentLabels = {
        profilePicture: "Profile Picture",
        cnicFront: "CNIC Front",
        cnicBack: "CNIC Back",
        chequePicture: "Cheque Picture",
        feeReceipt: "Processing Fee Receipt"
    }

    const requiredDocumentIds = [
        "profilePicture",
        "cnicFront",
        "cnicBack",
        "chequePicture",
        "feeReceipt"
    ]

    resellerForm.addEventListener("submit", async function (event) {
        event.preventDefault()

        if (isSubmitting) return

        /* ================================================
           GET FORM VALUES
        ================================================ */

        const fullName = $("fullName")?.value.trim() || ""
        const phone = $("phone")?.value.trim() || ""
        const email = $("email")?.value.trim() || ""
        const city = $("city")?.value.trim() || ""
        const cnic = $("cnic")?.value.trim() || ""
        const paymentMethod = $("paymentMethod")?.value || ""
        const accountNumber = $("accountNumber")?.value.trim() || ""
        const terms = $("terms")

        /* ================================================
           BASIC VALIDATION
        ================================================ */

        if (
            !fullName ||
            !phone ||
            !email ||
            !city ||
            !cnic ||
            !paymentMethod ||
            !accountNumber
        ) {
            alert("Please complete all required fields.")
            return
        }

        const cnicDigits = cnic.replace(/\D/g, "")

        if (cnicDigits.length !== 13) {
            alert("Please enter a valid 13 digit CNIC number.")
            return
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

        if (!emailRegex.test(email)) {
            alert("Please enter a valid email address.")
            return
        }

        if (terms && !terms.checked) {
            alert("Please accept the terms and conditions.")
            return
        }

        /* ================================================
           CHECK FIREBASE AND CLOUDINARY INITIALIZATION
        ================================================ */

        if (!SUB || !SUB.configured) {
            alert("The store is not connected to Firebase yet.")
            console.error("SUB or Firebase configuration is missing.")
            return
        }

        if (!SUB.db) {
            alert("Firebase database is not initialized.")
            console.error("SUB.db is missing.")
            return
        }

        if (!SUB.cloud || typeof SUB.cloud.upload !== "function") {
            alert("Cloudinary upload service is not initialized. Please check sub-core.js.")
            console.error("SUB.cloud.upload is missing.")
            return
        }

        if (typeof SUB.cloud.valid !== "function") {
            alert("Document validation service is unavailable. Please check sub-core.js.")
            console.error("SUB.cloud.valid is missing.")
            return
        }

        /* ================================================
           GET DOCUMENT FILES
        ================================================ */

        const files = {}

        for (const id of requiredDocumentIds) {
            const input = $(id)
            const file = input?.files?.[0]

            if (!file) {
                alert(`Please upload ${documentLabels[id]}.`)
                return
            }

            const allowPdf = id === "feeReceipt"

            const validationError = SUB.cloud.valid(file, allowPdf)

            if (validationError) {
                alert(validationError)
                return
            }

            files[id] = file
        }

        /* ================================================
           BUTTON LOADING
        ================================================ */

        const submitButton = resellerForm.querySelector(
            'button[type="submit"]'
        )

        const originalButtonHTML = submitButton
            ? submitButton.innerHTML
            : ""

        isSubmitting = true

        if (submitButton) {
            submitButton.disabled = true
            submitButton.textContent = "Preparing documents..."
        }

        try {
            /* ============================================
               UPLOAD DOCUMENTS TO CLOUDINARY
            ============================================ */

            const docs = {}

            const totalFiles = requiredDocumentIds.length

            for (let index = 0; index < totalFiles; index++) {
                const id = requiredDocumentIds[index]
                const file = files[id]

                const allowPdf = id === "feeReceipt"

                console.log(
                    `Cloudinary upload ${index + 1}/${totalFiles}:`,
                    id,
                    file.name
                )

                if (submitButton) {
                    submitButton.textContent =
                        `Uploading ${index + 1}/${totalFiles}: ${documentLabels[id]}`
                }

                let response

                try {
                    response = await SUB.cloud.upload(file, {
                        folder: "reseller-applications",
                        allowPdf: allowPdf
                    })
                } catch (uploadError) {
                    console.error(
                        `Cloudinary upload failed for ${id}:`,
                        uploadError
                    )

                    throw new Error(
                        `${documentLabels[id]} upload failed: ` +
                        (uploadError?.message || "Cloudinary rejected the upload.")
                    )
                }

                const imageURL = getUploadedURL(response)

                if (!imageURL) {
                    console.error("Invalid Cloudinary response:", response)

                    throw new Error(
                        `Cloudinary did not return a URL for ${documentLabels[id]}.`
                    )
                }

                docs[id] = imageURL

                console.log(
                    `Successfully uploaded ${id}:`,
                    imageURL
                )
            }

            /* ============================================
               VALIDATE ALL CLOUDINARY URLS
            ============================================ */

            if (Object.keys(docs).length !== totalFiles) {
                throw new Error("Some documents were not uploaded successfully.")
            }

            console.log("All Cloudinary uploads completed:", docs)

            /* ============================================
               SAVE APPLICATION TO FIRESTORE
            ============================================ */

            if (submitButton) {
                submitButton.textContent = "Submitting application..."
            }

            const applicationData = {
                fullName: fullName,
                phone: phone,
                email: email.toLowerCase(),
                city: city,
                cnic: cnic,
                paymentMethod: paymentMethod,
                accountNumber: accountNumber,
                documents: docs,
                status: "Pending",
                createdAt:
                    typeof SUB.now === "function"
                        ? SUB.now()
                        : firebase.firestore.FieldValue.serverTimestamp()
            }

            const result = await SUB.db
                .collection("resellerApplications")
                .add(applicationData)

            console.log(
                "Reseller application submitted successfully:",
                result.id
            )

            /* ============================================
               RESET FORM AND SHOW SUCCESS
            ============================================ */

            resellerForm.reset()

            resetDocumentPreviews()

            showSuccessModal()

        } catch (error) {
            console.error("RESELLER APPLICATION ERROR:", error)

            alert(
                error?.message ||
                "Could not submit your application. Please try again."
            )

        } finally {
            isSubmitting = false

            if (submitButton) {
                submitButton.disabled = false
                submitButton.innerHTML = originalButtonHTML
            }
        }
    })

    console.log("Subeesha Become Reseller JS initialized successfully.")

})()
