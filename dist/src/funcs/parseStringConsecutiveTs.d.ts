import { ParsedIngredient } from '../../types.js';
export type ParsedIngredientOmitType = Omit<ParsedIngredient, 'originalIngredientString' | 'comment'>;
export declare const parseStringConsecutiveTs: (ingrStr: string) => ParsedIngredientOmitType;
