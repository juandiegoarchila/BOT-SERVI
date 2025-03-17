// src/handlers/state-dispatcher.js
import {
  handleAwaitingOrderCount,
  handleDefiningLunchGroups,
  handleDefiningGroupSoup,
  handleDefiningGroupPrinciple,
  handleDefiningGroupPrincipleReplacement,
  handleDefiningGroupProtein,
  handleDefiningGroupExtraProtein,
  handleDefiningGroupExtraProteinCount,
  handleDefiningGroupExtraProteinType,
  handleDefiningGroupDrink,
  handleDefiningGroupSaladRice,
  handleDefiningRemaining,
  handleDefiningDifferentSoup,  
  handleDefiningDifferentPrinciple,
  handleDefiningDifferentPrincipleReplacement,
  handleDefiningDifferentProtein,
  handleDefiningDifferentExtraProtein,
  handleDefiningDifferentExtraProteinType,
  handleDefiningDifferentDrink,
  handleDefiningDifferentSaladRice,
  handleDefiningSingleLunchSoup,
  handleDefiningSingleLunchPrinciple,
  handleDefiningSingleLunchPrincipleReplacement,
  handleDefiningSingleLunchProtein,
  handleDefiningSingleLunchExtraProtein,
  handleDefiningSingleLunchExtraProteinType,
  handleDefiningSingleLunchDrink,
  handleDefiningSingleLunchSaladRice,
} from './lunch-handlers.js';

import {
  handleOrderingTime,
  handleOrderingSameAddress,
  handleOrderingAddressSingle,
  handleConfirmingAddressSingle,
  handleOrderingAddressMultiple,
  handleOrderingPayment,
  handleOrderingCutlery,
  handlePreviewOrder,
  handleAwaitingFeedback,
  handleAdjustingPayment, 
} from './order-handlers.js';

import {
  handleSelectingLunchToAdjust,
  handleSelectingAdjustment,
  handleAdjustingField,
  handleAdjustingNoPrinciple,
  handleAdjustingExtraProtein,
  handleChangingExtraProtein,
} from './adjustment-handlers.js';

const stateHandlers = {
  // Lunch flow
  awaiting_order_count: handleAwaitingOrderCount,
  defining_lunch_groups: handleDefiningLunchGroups,
  defining_group_soup: handleDefiningGroupSoup,
  defining_group_principle: handleDefiningGroupPrinciple,
  defining_group_principle_replacement: handleDefiningGroupPrincipleReplacement,
  defining_group_protein: handleDefiningGroupProtein,
  defining_group_extra_protein: handleDefiningGroupExtraProtein,
  defining_group_extra_protein_count: handleDefiningGroupExtraProteinCount,
  defining_group_extra_protein_type: handleDefiningGroupExtraProteinType,
  defining_group_drink: handleDefiningGroupDrink,
  defining_group_salad_rice: handleDefiningGroupSaladRice,
  defining_remaining: handleDefiningRemaining,
  defining_different_soup: handleDefiningDifferentSoup,
  defining_different_principle: handleDefiningDifferentPrinciple,
  defining_different_principle_replacement: handleDefiningDifferentPrincipleReplacement,
  defining_different_protein: handleDefiningDifferentProtein,
  defining_different_extra_protein: handleDefiningDifferentExtraProtein,
  defining_different_extra_protein_type: handleDefiningDifferentExtraProteinType,
  defining_different_drink: handleDefiningDifferentDrink,
  defining_different_salad_rice: handleDefiningDifferentSaladRice,
  defining_single_lunch_soup: handleDefiningSingleLunchSoup,
  defining_single_lunch_principle: handleDefiningSingleLunchPrinciple,
  defining_single_lunch_principle_replacement: handleDefiningSingleLunchPrincipleReplacement,
  defining_single_lunch_protein: handleDefiningSingleLunchProtein,
  defining_single_lunch_extra_protein: handleDefiningSingleLunchExtraProtein,
  adjusting_payment: handleAdjustingPayment,
  defining_single_lunch_extra_protein_type: handleDefiningSingleLunchExtraProteinType,
  defining_single_lunch_drink: handleDefiningSingleLunchDrink,
  defining_single_lunch_salad_rice: handleDefiningSingleLunchSaladRice,

  // Order flow
  ordering_time: handleOrderingTime,
  ordering_same_address: handleOrderingSameAddress,
  ordering_address_single: handleOrderingAddressSingle,
  confirming_address_single: handleConfirmingAddressSingle,
  ordering_address_multiple: handleOrderingAddressMultiple,
  ordering_payment: handleOrderingPayment,
  ordering_cutlery: handleOrderingCutlery,
  preview_order: handlePreviewOrder,
  awaiting_feedback: handleAwaitingFeedback, // Cambiamos completed por awaiting_feedback

  // Adjustment flow
  selecting_lunch_to_adjust: handleSelectingLunchToAdjust,
  selecting_adjustment: handleSelectingAdjustment,
  adjusting_field: handleAdjustingField,
  adjusting_no_principle: handleAdjustingNoPrinciple,
  adjusting_extra_protein: handleAdjustingExtraProtein,
  changing_extra_protein: handleChangingExtraProtein,
};

export function dispatchState(conversation, message, client) { // Añadimos client como parámetro
  const handler = stateHandlers[conversation.step];
  if (handler) {
    return handler(conversation, message, client); // Pasamos client al manejador
  }
  return {
    main: `❌ Estado desconocido: ${conversation.step}. Por favor, reinicia tu pedido diciendo "hola".`,
    clearConversation: true,
  };
}