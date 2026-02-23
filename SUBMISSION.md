# Submission

**Candidate name:** Susan Wie
**Date:** 02/22/2026
**Time spent:** 4.5 hours

---

## Completed Tasks

Check off what you finished:

- [X] Task 1 — Create Product
- [X] Task 2 — Update Variant
- [X] Task 3 — Fix soft-delete bug
- [X] Task 4 — Loading & error states
- [X] Task 5 — Input validation

---

## Approach & Decisions

Note I used ChatGPT to assist with all tasks.

### Task 1
Approach
I started with sharing the task with ChatGPT, clearly outlining the goals for the page (in terms of both style and function). I began with the frontend by building the "Create Product" page, where a user can enter product details, with key fields marked as required. When the user clicks Create, the app sends the form data to the backend to create the product and its variants. 

Once the page was functioning successfully, I iterated on the UI for user experience: adding red asterisks for required fields, adding grey placeholders for Product Name, Description, SKU, etc. As a last step, I checked stores on UberEats and DoorDash to compare what information is typically collected and how it’s presented, and used those references to refine the UI.

Decisions/Tradeoffs
1. On the backend, I implemented POST /api/products using a database transaction so that the product would not save without its variants if something were to fail.
2. I made Price and Inventory required fields and marked them with red asterisks while adding default values of 0 in the form. While Price and Inventory cannot be empty, they do not have to be non-zero.
3. Used the full backend URL to avoid local proxy issues while developing.

### Task 2
Approach
I updated the Edit button so that when the user clicks Edit, the Price and Inventory fields turn into inputs. Clicking Save triggers the backend to validate the inputs and update the database with the latest variant information.

Decisions/Tradeoffs
1. Per the prompt, I kept the Edit feature focused only on Price and Inventory, excluding fields like SKU, Product Name, Description, etc. 

### Task 3
Approach
I added a condition to the GET /api/products query to exclude soft-deleted products. On the frontend, once a product is deleted, the product disappears from the products list. 

Decisions/Tradeoffs
1. I added the filter in the query builder so that soft-deleted products are always excluded, even when filters/search are used.

### Task 4
Approach
Added two states (loading and error) to the backend where the Products page retrieves data. The UI temporarily shows a spinning Loading message and then shows an Error message. The Retry button calls the same function that fetches the Product data. 

Decisions/Tradeoffs
1. Made stylistic decisions to make the Retry button green (consistent with existing UI), center the error message, etc. 

### Task 5
Approach
Across the Products page, Product Details page, Edit functions, etc., I ensured that validation exists in both the frontend and the backend. In the frontend, the appropriate parameters would be communicated to the user via a red highlight around the required fields or an error message upon attempted submission. In the backend, I added checks for creating a product and updating a variant so that if a rule was not followed (i.e. Inventory < 0), the server would return JSON 400/404 errors. 

Decisions/Tradeoffs
1. I altered the code so that multiple errors could be collected and the error message would acknowledge multiple errors. 

---

## What I'd improve with more time

Create Product Page:
1. Give the user the ability to create a new status and/or category on this page
2. Add "Uncategorized" as a category in the dropdown list. Subsequently, add "Uncategorized" as a category in the Categories page so users can monitor which products do not belong to a category
3. Instead of a dropdown menu for the Status field, show "active" and "draft in the same UI as they exist on the Products page (with yellow and green highlight around the text) to remind the user what the Status field is
4. Once a user inputs a Price and hits enter/clicks elsewhere on the screen, change the value to a dollar value with a $
5. Add a section to add photos
6. Change placement of the drop down arrow to be closer to the text ("active" and "none")
7. Add character limits for Product Name, Description, SKU, Variant Name

Other:
1. Create a page to view all deleted products
2. Create an "Undo Delete" button that appears on the Products page (or wherever the redirected page is) once a product has been deleted
3. When the error screen is shown and the Retry button is clicked, replace the "Retry" text with a loading spinner to show that the data is attempting to be fetched
4. When there is an error in loading the Products page, do not give the user the ability to click the "Add New Product" button (show different error message)
5. Allow the user to search by SKU
6. If the user is creating a new product and they try to navigate to a different page, show a warning that progress will be lost if there are unsaved changes

Backend recommendations from ChatGPT:
1. Add a small shared API error handling wrapper in frontend/src/lib to standardize error parsing and messaging
2. Add a reusable FormField component (label + input + error + styling) to reduce repeated code for validation UI
3. Add a consistent backend error format across all routes (some routes still use plain text in older handlers)

---

## Anything else?

Initially, I began the project using a version of Node (v23.11.0) that is susceptible to weird dev/server behavior. This caused many issues with the files I created (corrupted files) and delayed the connection to the servers which stalled my completion of the project. As a result, I switched to Node 20, reducing the random tooling failures I was experiencing. 
