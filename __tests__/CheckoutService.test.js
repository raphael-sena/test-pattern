import { CheckoutService } from '../src/services/CheckoutService.js';
import { Pedido } from '../src/domain/Pedido.js';
import { Item } from '../src/domain/Item.js';
import { UserMother } from './builders/UserMother.js';
import { CarrinhoBuilder } from './builders/CarrinhoBuilder.js';

describe('CheckoutService', () => {

    describe('quando o pagamento falha', () => {
        it('deve retornar null', async () => {
            // Arrange
            const carrinho = new CarrinhoBuilder().build();
            const cartaoCredito = { numero: '1234-5678-9012-3456' };

            const gatewayStub = { cobrar: jest.fn().mockResolvedValue({ success: false }) };
            const repositoryDummy = { salvar: jest.fn() };
            const emailDummy = { enviarEmail: jest.fn() };

            const service = new CheckoutService(gatewayStub, repositoryDummy, emailDummy);

            // Act
            const pedido = await service.processarPedido(carrinho, cartaoCredito);

            // Assert
            expect(pedido).toBeNull();
        });
    });

    describe('quando um cliente Premium finaliza a compra', () => {
        it('deve aplicar desconto de 10% e cobrar o valor correto', async () => {
            // Arrange
            const userPremium = UserMother.umUsuarioPremium();
            const carrinho = new CarrinhoBuilder()
                .comUser(userPremium)
                .comItens([new Item('Produto A', 100), new Item('Produto B', 100)])
                .build();
            const cartaoCredito = { numero: '9876-5432-1098-7654' };

            const pedidoSalvo = new Pedido(42, carrinho, 180, 'PROCESSADO');

            const gatewayStub = { cobrar: jest.fn().mockResolvedValue({ success: true }) };
            const repositoryStub = { salvar: jest.fn().mockResolvedValue(pedidoSalvo) };
            const emailMock = { enviarEmail: jest.fn().mockResolvedValue(undefined) };

            const service = new CheckoutService(gatewayStub, repositoryStub, emailMock);

            // Act
            const resultado = await service.processarPedido(carrinho, cartaoCredito);

            // Assert - Verificação de Comportamento
            expect(gatewayStub.cobrar).toHaveBeenCalledWith(180, cartaoCredito);

            expect(emailMock.enviarEmail).toHaveBeenCalledTimes(1);
            expect(emailMock.enviarEmail).toHaveBeenCalledWith(
                'premium@email.com',
                'Seu Pedido foi Aprovado!',
                expect.any(String)
            );

            expect(resultado).toEqual(pedidoSalvo);
        });
    });

});
