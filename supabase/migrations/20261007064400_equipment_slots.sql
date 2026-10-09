-- Expand equipment slots: separate gloves from hands and add three accessory positions.
alter table public.items drop constraint if exists items_equipment_slot_check;
alter table public.character_inventory drop constraint if exists character_inventory_equipped_slot_check;

update public.items
set equipment_slot = 'accessory_ring'
where equipment_slot = 'accessory';

update public.items
set equipment_slot = 'hands'
where equipment_slot = 'hands';

update public.character_inventory
set equipped_slot = 'accessory_ring'
where equipped_slot = 'accessory';

alter table public.items
    add constraint items_equipment_slot_check
    check (
        equipment_slot in (
            'head','chest','hands','legs','feet',
            'main_hand','off_hand',
            'accessory_chain','accessory_ring','accessory_bracelet'
        )
        or equipment_slot is null
    );

alter table public.character_inventory
    add constraint character_inventory_equipped_slot_check
    check (
        equipped_slot in (
            'head','chest','hands','legs','feet',
            'main_hand','off_hand',
            'accessory_chain','accessory_ring','accessory_bracelet'
        )
        or equipped_slot is null
    );
