const { validateCountInput } = require('../utils/validation');

describe('validateCountInput', () => {
    describe('basic mode', () => {
        it('should accept valid integers', () => {
            expect(validateCountInput('5', 'basic')).toEqual({ isValid: true, userNumber: 5 });
            expect(validateCountInput('  10  ', 'basic')).toEqual({ isValid: true, userNumber: 10 });
        });

        it('should reject non-integers and math equations', () => {
            expect(validateCountInput('5.5', 'basic').isValid).toBe(false);
            expect(validateCountInput('5+5', 'basic').isValid).toBe(false);
            expect(validateCountInput('five', 'basic').isValid).toBe(false);
        });
    });

    describe('advanced mode (allows numbers AND math)', () => {
        it('should accept math equations', () => {
            expect(validateCountInput('5+5', 'advanced')).toEqual({ isValid: true, userNumber: 10 });
            expect(validateCountInput('10/2', 'advanced')).toEqual({ isValid: true, userNumber: 5 });
            expect(validateCountInput('2*(3+4)', 'advanced')).toEqual({ isValid: true, userNumber: 14 });
        });

        it('should accept plain numbers', () => {
            expect(validateCountInput('5', 'advanced')).toEqual({ isValid: true, userNumber: 5 });
        });

        it('should reject variables and text', () => {
            expect(validateCountInput('x=5', 'advanced').isValid).toBe(false);
            expect(validateCountInput('five', 'advanced').isValid).toBe(false);
        });
    });

    describe('strict math mode (math_only) (REQUIRES math)', () => {
        it('should accept valid math equations containing operators', () => {
            expect(validateCountInput('5+5', 'math_only')).toEqual({ isValid: true, userNumber: 10 });
            expect(validateCountInput('10/2', 'math_only')).toEqual({ isValid: true, userNumber: 5 });
            expect(validateCountInput('(10)', 'math_only')).toEqual({ isValid: true, userNumber: 10 });
        });

        it('should reject plain numbers', () => {
            expect(validateCountInput('5', 'math_only').isValid).toBe(false);
            expect(validateCountInput('100', 'math_only').isValid).toBe(false);
        });

        it('should reject variables and text', () => {
            expect(validateCountInput('x=5', 'math_only').isValid).toBe(false);
            expect(validateCountInput('five', 'math_only').isValid).toBe(false);
        });
    });
});
