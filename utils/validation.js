const { evaluate } = require('mathjs');

function validateCountInput(content, mode) {
    if (mode === 'math_only') {
        const hasLettersOrVariables = /[a-zA-Z=]/.test(content);
        // Ensure there is at least one mathematical operator or parenthesis
        const hasMathOperators = /[\+\-\*\/\^\(\)]/.test(content);

        if (hasLettersOrVariables || !hasMathOperators) {
            return { isValid: false, userNumber: null };
        }
        try {
            const userNumber = evaluate(content);
            if (typeof userNumber === 'number' && !isNaN(userNumber)) {
                return { isValid: true, userNumber };
            }
        } catch (error) {
            return { isValid: false, userNumber: null };
        }
    } else if (mode === 'advanced') {
        const hasLettersOrVariables = /[a-zA-Z=]/.test(content);
        
        if (hasLettersOrVariables) {
            return { isValid: false, userNumber: null };
        } else {
            try {
                const userNumber = evaluate(content);
                if (typeof userNumber === 'number' && !isNaN(userNumber)) {
                    return { isValid: true, userNumber };
                }
            } catch (error) {
                return { isValid: false, userNumber: null };
            }
        }
    } else { // basic
        if (/^\d+$/.test(content.trim())) {
            const userNumber = parseInt(content.trim(), 10);
            return { isValid: true, userNumber };
        }
    }
    
    return { isValid: false, userNumber: null };
}

module.exports = { validateCountInput };
