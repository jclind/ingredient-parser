import { ParsedIngredient } from '../../types.js';
type ParsedIngredientOmitType = Omit<ParsedIngredient, 'originalIngredientString' | 'comment'>;
export declare const parseStringConsecutiveTs: (ingrStr: string) => ParsedIngredientOmitType;
export {};
