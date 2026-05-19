import * as yup from 'yup'

/** Те же правила, что на странице заказа (имя / фамилия). */
export const personalNameFieldsSchema = yup.object().shape({
    personalFirstName: yup
        .string()
        .trim()
        .required('Имя обязательно')
        .min(2, 'Имя должно содержать минимум 2 символа')
        .max(25, 'Имя не должно превышать 25 символов')
        .matches(
            /^[а-яА-ЯёЁa-zA-Z]+(?:-[а-яА-ЯёЁa-zA-Z]+)?$/,
            'Имя может содержать только буквы и один дефис',
        ),
    personalLastName: yup
        .string()
        .trim()
        .required('Фамилия обязательна')
        .min(2, 'Фамилия должна содержать минимум 2 символа')
        .max(25, 'Фамилия не должна превышать 25 символов')
        .matches(
            /^[а-яА-ЯёЁa-zA-Z]+(?:-[а-яА-ЯёЁa-zA-Z]+)?$/,
            'Фамилия может содержать только буквы и один дефис',
        ),
})

export type PersonalNameField = 'personalFirstName' | 'personalLastName'

export async function validatePersonalNameField(
    fieldName: PersonalNameField,
    value: string,
): Promise<string | undefined> {
    try {
        await personalNameFieldsSchema.validateAt(fieldName, { [fieldName]: value })
        return undefined
    } catch (error) {
        if (error instanceof yup.ValidationError) {
            return error.message
        }
        return 'Некорректное значение'
    }
}

export function userNeedsPersonalName(user: {
    personalFirstName?: string | null
    personalLastName?: string | null
}): boolean {
    return !user.personalFirstName?.trim() || !user.personalLastName?.trim()
}
