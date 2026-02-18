import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Index,
  JoinColumn,
} from 'typeorm';
import { Wallet } from 'src/wallet/entities/wallet.entity';
import { TransactionStatus } from 'src/transaction/enums/transaction.enum';

@Entity('transfers')
export class Transfer {
  @PrimaryGeneratedColumn('uuid')
  id: string; // Transfer identifier

  @Index()
  @Column({ type: 'uuid' })
  senderWalletId: string;

  @ManyToOne(() => Wallet)
  @JoinColumn({ name: 'senderWalletId' })
  senderWallet: Wallet; // Initiator / owner of transfer

  @Index()
  @Column({ type: 'uuid' })
  receiverWalletId: string;

  @ManyToOne(() => Wallet)
  @JoinColumn({ name: 'receiverWalletId' })
  receiverWallet: Wallet; // Receiver wallet

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
  })
  amount: string; // Transfer amount

  @Index()
  @Column({ type: 'uuid' })
  reference: string; // Shared with transactions for linking

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.COMPLETED,
  })
  status: TransactionStatus; // pending / completed / failed

  @CreateDateColumn()
  createdAt: Date;
}
